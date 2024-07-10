import { Injectable } from "@nestjs/common";
import * as excel from "excel4node";

import { isValidDate, formatDateTime } from "src/system/common/utils";

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
    if (header?.type === "link") {
      cell.link(item[header.key as keyof Item]);
    } else if (header?.type === "number") {
      cell.number(item[header.key as keyof Item]);
    } else if (header?.type === "date") {
      if (isValidDate(item[header.key as keyof Item])) {
        cell.string(formatDateTime(new Date(item[header.key as keyof Item])));
      } else {
        cell.string("invalid date");
      }
    } else {
      cell.string(
        item[header.key as keyof Item]
          ? item[header.key as keyof Item].toString()
          : "Нет данных"
      );
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
