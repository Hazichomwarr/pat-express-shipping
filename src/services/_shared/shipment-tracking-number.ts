import { randomBytes as secureRandomBytes } from "node:crypto";

const TRACKING_NUMBER_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TRACKING_NUMBER_SUFFIX_LENGTH = 8;
const TRACKING_NUMBER_PATTERN =
  /^PAT-\d{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;

type RandomByteSource = (size: number) => Uint8Array;

type GenerateShipmentTrackingNumberOptions = {
  date?: Date;
  randomBytes?: RandomByteSource;
};

export function generateShipmentTrackingNumber(
  options: GenerateShipmentTrackingNumberOptions = {},
) {
  const date = options.date ?? new Date();
  const year = date.getFullYear();

  if (!Number.isInteger(year) || year < 0 || year > 9999) {
    throw new Error("A valid date with a four-digit year is required.");
  }

  const randomByteSource = options.randomBytes ?? secureRandomBytes;
  const bytes = randomByteSource(TRACKING_NUMBER_SUFFIX_LENGTH);

  if (bytes.length !== TRACKING_NUMBER_SUFFIX_LENGTH) {
    throw new Error(
      `The random byte source must return exactly ${TRACKING_NUMBER_SUFFIX_LENGTH} bytes.`,
    );
  }

  const suffix = Array.from(
    bytes,
    (byte) => TRACKING_NUMBER_ALPHABET[byte & 31],
  ).join("");

  return `PAT-${String(year).padStart(4, "0")}-${suffix}`;
}

export function isShipmentTrackingNumber(value: string) {
  return TRACKING_NUMBER_PATTERN.test(value);
}
