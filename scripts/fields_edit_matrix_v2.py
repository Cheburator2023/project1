#!/usr/bin/env python3
"""
Validate field editability matrix against backend artefacts payload.

Why this script:
- compares by tech_label (stable) instead of only UI label (unstable)
- supports scenarios (role, source, mode, active_model)
- allows label->tech_label resolution from artefacts dump

Input files:
1) artefacts json from backend endpoint (array or {"data": [...]})
2) expected matrix json (see EXAMPLE at bottom)
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class Scenario:
    name: str
    role: str
    source: str  # sum | sum_rm
    mode: str  # add | edit
    active_model: Optional[bool]
    expectations: Dict[str, bool]  # tech_label -> editable_expected


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def normalize_source(source: str) -> str:
    source = source.strip().lower()
    if source in {"rm", "sum-rm", "sum_rm"}:
        return "sum_rm"
    if source == "sum":
        return "sum"
    return source


def extract_artefacts(raw: Any) -> List[Dict[str, Any]]:
    if isinstance(raw, dict) and isinstance(raw.get("data"), list):
        return raw["data"]
    if isinstance(raw, list):
        return raw
    raise ValueError("Unsupported artefacts json format: expected list or {'data': [...]} ")


def build_label_map(artefacts: List[Dict[str, Any]]) -> Dict[str, str]:
    label_to_tech: Dict[str, str] = {}
    for a in artefacts:
        label = str(a.get("artefact_label", "")).strip()
        tech = str(a.get("artefact_tech_label", "")).strip()
        if label and tech and label not in label_to_tech:
            label_to_tech[label] = tech
    return label_to_tech


def parse_scenarios(raw: Any, label_map: Dict[str, str]) -> List[Scenario]:
    if not isinstance(raw, dict) or not isinstance(raw.get("scenarios"), list):
        raise ValueError("Expected matrix json format: {'scenarios': [...]} ")

    scenarios: List[Scenario] = []
    for idx, item in enumerate(raw["scenarios"]):
        name = str(item.get("name") or f"scenario_{idx+1}")
        role = str(item["role"]).strip()
        source = normalize_source(str(item["source"]))
        mode = str(item.get("mode", "edit")).strip().lower()
        active_model = item.get("active_model")

        expected_raw = item.get("expected", {})
        if not isinstance(expected_raw, dict):
            raise ValueError(f"{name}: expected must be object")

        expectations: Dict[str, bool] = {}
        for key, val in expected_raw.items():
            if not isinstance(val, bool):
                raise ValueError(f"{name}: expected['{key}'] must be bool")
            tech_label = key
            # Allow passing human label as key: resolve to tech_label.
            if key in label_map:
                tech_label = label_map[key]
            expectations[tech_label] = val

        scenarios.append(
            Scenario(
                name=name,
                role=role,
                source=source,
                mode=mode,
                active_model=active_model,
                expectations=expectations,
            )
        )
    return scenarios


def actual_editable_by_source(artefact: Dict[str, Any], source: str) -> bool:
    source = normalize_source(source)
    if str(artefact.get("is_edit_flg", "0")) != "1":
        return False
    if source == "sum":
        return str(artefact.get("is_editable_by_role_sum", "0")) == "1"
    if source == "sum_rm":
        return str(artefact.get("is_editable_by_role_sum_rm", "0")) == "1"
    return False


def run_check(scenarios: List[Scenario], artefacts: List[Dict[str, Any]]) -> int:
    by_tech = {
        str(a.get("artefact_tech_label", "")).strip(): a
        for a in artefacts
        if a.get("artefact_tech_label")
    }
    total = 0
    mismatches = 0

    for s in scenarios:
        print(f"\n[{s.name}] role={s.role} source={s.source} mode={s.mode} active_model={s.active_model}")
        for tech, expected in s.expectations.items():
            total += 1
            artefact = by_tech.get(tech)
            if not artefact:
                mismatches += 1
                print(f"  MISMATCH {tech}: expected={expected}, actual=<NOT_FOUND>")
                continue

            actual = actual_editable_by_source(artefact, s.source)
            # NOTE: runtime UI conditions (mode, active_model, valueConditions, block-list) are NOT included here.
            # This check validates base permission flags from artefacts API.
            if actual != expected:
                mismatches += 1
                print(f"  MISMATCH {tech}: expected={expected}, actual={actual}")
            else:
                print(f"  OK       {tech}: {actual}")

    print("\n---")
    print(f"Checked: {total}")
    print(f"Mismatches: {mismatches}")
    return 1 if mismatches else 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate SURM edit matrix by tech_label")
    parser.add_argument("--artefacts-json", required=True, help="Path to artefacts response json")
    parser.add_argument("--matrix-json", required=True, help="Path to expected matrix json")
    args = parser.parse_args()

    artefacts_raw = load_json(Path(args.artefacts_json))
    artefacts = extract_artefacts(artefacts_raw)
    label_map = build_label_map(artefacts)

    matrix_raw = load_json(Path(args.matrix_json))
    scenarios = parse_scenarios(matrix_raw, label_map)

    return run_check(scenarios, artefacts)


if __name__ == "__main__":
    sys.exit(main())

