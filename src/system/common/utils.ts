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
      sql.replace(new RegExp(`:${key}`, 'gi'), `$${ index }`),
      [...array, value],
      index + 1
    ],
    [parameterizedSql, [], 1]
  );

  return { text, values };
};

/**
 * Pads a number with leading zeros to ensure it has a specified length.
 *
 * @param {number} number - The number to pad.
 * @param {number} [length=2] - The desired length of the output string.
 * @returns {string} - The padded number as a string.
 */
const pad = (number: number, length: number = 2): string => {
  return ('0'.repeat(length) + number).slice(-length);
};

/**
 * Parses a date string in various formats (dd.mm.yyyy, mm/dd/yyyy, yyyy, YYYY-MM-DD) or a Date object into a Date object.
 *
 * @param {string | Date} dateInput - The date string or Date object to parse.
 * @returns {Date | null} - The parsed Date object or null if the format is invalid.
 */
const parseDate = (dateInput: string | Date): Date | null => {
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : new Date(dateInput.getTime() + (3 * 60 * 60 * 1000));
  }

  let date: Date | null = null;
  let day: number, month: number, year: number;

  if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateInput)) {
    [day, month, year] = dateInput.split('.').map(Number);
    if (month >= 1 && month <= 12) {
      date = new Date(year, month - 1, day);
    }
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateInput)) {
    [month, day, year] = dateInput.split('/').map(Number);
    if (month >= 1 && month <= 12) {
      date = new Date(year, month - 1, day);
    }
  } else if (/^\d{4}$/.test(dateInput)) {
    year = Number(dateInput);
    date = new Date(year, 0, 1);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    [year, month, day] = dateInput.split('-').map(Number);
    date = new Date(year, month - 1, day);
  }

  // Check for valid date by comparing the original and resulting date components
  if (date && !/^\d{4}(-\d{2}-\d{2})?$/.test(dateInput)) {
    const parsedMonth = month - 1;
    if (date.getFullYear() !== year || date.getMonth() !== parsedMonth || date.getDate() !== day) {
      return null;
    }
  }

  return date && !isNaN(date.getTime()) ? date : null;
};

/**
 * Formats a Date object into a string in the format yyyy-mm-dd hh:mm:ss.
 *
 * @param {Date} date - The Date object to format.
 * @returns {string} - The formatted date string.
 */
const formatDateTime = (date: Date): string => {
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const HH = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());

  // @TODO: привести к одному формату фронт + отчеты
  if (`${HH}:${mm}:${ss}` === '00:00:00') {
    return `${yyyy}-${MM}-${dd} 24:00`
  }

  return `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}`;
};

/**
 * Checks if a given date string or Date object is valid according to the supported formats.
 *
 * @param {string | Date} dateInput - The date string or Date object to validate.
 * @returns {boolean} - True if the date is valid, otherwise false.
 */
const isValidDate = (dateInput: string | Date): boolean => {
  const date = parseDate(dateInput);
  return date !== null;
};

export { queryConvert, isValidDate, parseDate, formatDateTime };
