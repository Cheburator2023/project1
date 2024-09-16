import { Injectable } from "@nestjs/common";
import * as excel from "excel4node";

import { isValidDate, parseDate, formatDateTime } from "src/system/common/utils";

interface Header {
  key: string;
  title: string;
  type?: "link" | "number" | "string" | "date";
}

interface Item {
  [key: string]: any;
}

interface Data {
  headers: Header[];
  body: Item[];
}

@Injectable()
export class ExcelService {
  setCellValue(cell: excel.Cell, header: Header, item: Item): void {
    const value = item[header.key as keyof Item];
    if (!header?.type) {
      cell.string(value ? value.toString() : "");
      return;
    }

    switch (header.type) {
      case "link":
        cell.link(value);
        break;
      case "number":
        cell.number(value);
        break;
      case "date":
        if (value) {
          cell.string(isValidDate(value) ? formatDateTime(parseDate(value)) : "");
        } else {
          cell.string("");
        }
        break;
      default:
        cell.string(value ? value.toString() : "");
        break;
    }
  }

  async createExcel(data: Data): Promise<Buffer> {
    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet("Report");

    const { headers, body } = data;

    headers.forEach((header, index) => {
      worksheet.column(1 + index).setWidth(header.title.length + 15);
      worksheet.cell(1, 1 + index).string(header.title);
    });

    body.forEach((item, rowIndex) => {
      headers.forEach((header, colIndex) => {
        this.setCellValue(worksheet.cell(2 + rowIndex, 1 + colIndex), header, item);
      });
    });

    return workbook.writeToBuffer();
  }
}
