interface QueryArgs {
  [key: string]: any;
}

interface QueryResult {
  text: string;
  values: any[];
}

const queryConvert = (parameterizedSql: string, args: QueryArgs): QueryResult => {
  const [text, values] = Object.entries(args).reduce<[string, any[], number]>(
    ([sql, array, index], [key, value]) => [
      sql.replace(new RegExp(`:${key}`, "gi"), `$${index}`),
      [...array, value],
      index + 1
    ],
    [parameterizedSql, [], 1]
  );

  return { text, values };
};

const pad = (number: number, length: number = 2): string => {
  return ("0".repeat(length) + number).slice(-length);
};

const formatDateTime = (date: Date): string => {
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const HH = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());

  return `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}`;
};

const isValidDate = (dateStr: string): boolean => {
  const timestamp = Date.parse(dateStr);
  return !isNaN(timestamp);
};

export { queryConvert, formatDateTime, isValidDate };
