#!/usr/bin/env python3
"""
Convert legacy surm_fields_edit.py structure to fields_edit_matrix_v2 json.

Input: python file with top-level variable `fields_to_edit = [...]`
Output: json: {"scenarios":[...]} compatible with fields_edit_matrix_v2.py
"""

from __future__ import annotations

import argparse
import ast
import json
from pathlib import Path
from typing import Any, Dict, List, Tuple


def load_fields_to_edit(py_path: Path) -> List[Dict[str, Any]]:
    src = py_path.read_text(encoding="utf-8")
    tree = ast.parse(src, filename=str(py_path))

    for node in tree.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "fields_to_edit":
                    value = ast.literal_eval(node.value)
                    if not isinstance(value, list):
                        raise ValueError("fields_to_edit is not a list")
                    return value
    raise ValueError("fields_to_edit variable not found")


def normalize_source(source_key: str) -> str:
    s = source_key.strip().lower()
    if s in {"rm", "sum-rm", "sum_rm"}:
        return "sum_rm"
    if s == "sum":
        return "sum"
    return s


def _flatten_nested_sources(
    root_label: str,
    node: Dict[str, Any],
    sep: str = " / ",
) -> List[Tuple[str, bool, bool]]:
    """
    Flatten nested structures to leaf entries with source flags.
    Example:
      {"Дата подтверждения использования": {"1Q": {"sum": False, "rm": False}}}
    becomes:
      ("Дата подтверждения использования / 1Q", False, False)
    """
    out: List[Tuple[str, bool, bool]] = []

    if {"sum", "rm"}.issubset(node.keys()) and isinstance(node.get("sum"), bool) and isinstance(
        node.get("rm"), bool
    ):
        out.append((root_label, node["sum"], node["rm"]))
        return out

    for child_key, child_val in node.items():
        if not isinstance(child_val, dict):
            continue
        child_label = f"{root_label}{sep}{child_key}"
        out.extend(_flatten_nested_sources(child_label, child_val, sep=sep))

    return out


def extract_simple_source_flags(attributes: Dict[str, Any]) -> Tuple[Dict[str, bool], Dict[str, bool], int]:
    expected_sum: Dict[str, bool] = {}
    expected_rm: Dict[str, bool] = {}
    skipped_nested = 0  # now counts unresolved nested nodes (no sum/rm leaves found)

    for label, val in attributes.items():
        if not isinstance(val, dict):
            continue
        # Simple case supported by v2 converter:
        # "Field label": {"sum": bool, "rm": bool}
        if {"sum", "rm"}.issubset(val.keys()) and isinstance(val.get("sum"), bool) and isinstance(val.get("rm"), bool):
            expected_sum[label] = val["sum"]
            expected_rm[label] = val["rm"]
            continue

        flattened = _flatten_nested_sources(label, val)
        if flattened:
            for nested_label, sum_flag, rm_flag in flattened:
                expected_sum[nested_label] = sum_flag
                expected_rm[nested_label] = rm_flag
            continue

        skipped_nested += 1

    return expected_sum, expected_rm, skipped_nested


def convert(raw: List[Dict[str, Any]]) -> Tuple[Dict[str, Any], Dict[str, int]]:
    scenarios: List[Dict[str, Any]] = []
    total_users = 0
    total_skipped_nested = 0

    for item in raw:
        user = str(item.get("user", "")).strip()
        attributes = item.get("attributes")
        if not user or not isinstance(attributes, dict):
            continue

        total_users += 1
        expected_sum, expected_rm, skipped = extract_simple_source_flags(attributes)
        total_skipped_nested += skipped

        # SUM scenario
        scenarios.append(
            {
                "name": f"{user}_sum_edit",
                "role": user,
                "source": normalize_source("sum"),
                "mode": "edit",
                "active_model": None,
                "expected": expected_sum,
            }
        )
        # RM scenario
        scenarios.append(
            {
                "name": f"{user}_rm_edit",
                "role": user,
                "source": normalize_source("rm"),
                "mode": "edit",
                "active_model": None,
                "expected": expected_rm,
            }
        )

    return {"scenarios": scenarios}, {
        "users": total_users,
        "scenarios": len(scenarios),
        "skipped_nested_attributes": total_skipped_nested,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Convert legacy surm_fields_edit.py to v2 matrix json")
    parser.add_argument("--input-py", required=True, help="Path to surm_fields_edit.py")
    parser.add_argument("--output-json", required=True, help="Path to output matrix json")
    args = parser.parse_args()

    data = load_fields_to_edit(Path(args.input_py))
    converted, stats = convert(data)
    Path(args.output_json).write_text(
        json.dumps(converted, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print("Conversion completed:")
    for k, v in stats.items():
        print(f"  {k}: {v}")
    print(f"  output: {args.output_json}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

