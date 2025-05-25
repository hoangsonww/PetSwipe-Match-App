import { Parser } from "json2csv";
import { Request, Response } from "express";

/**
 * Convert objects to CSV and send as attachment.
 */
export function sendCsv<T>(res: Response, data: T[], filename: string): void {
  const parser = new Parser();
  const csv = parser.parse(data);
  res.header("Content-Type", "text/csv");
  res.attachment(filename);
  res.send(csv);
}
