import { z } from "zod";
import { hasRichText } from "./richText.js";

const localized = z
  .object({
    ar: z.string().trim().min(1).max(5000),
    fr: z.string().trim().max(5000).optional(),
  })
  .strict()
  .transform(({ ar, fr }) => ({ ar, fr: fr || ar }));
const paragraphItem = z.string().trim().min(1).max(10000);
const paragraphList = z.array(paragraphItem).min(1).max(30);
const paragraphs = z
  .object({
    ar: paragraphList,
    fr: z.array(paragraphItem).max(30).optional(),
  })
  .strict()
  .transform(({ ar, fr }) => ({ ar, fr: fr?.length ? fr : [...ar] }));
const richText = z
  .string()
  .trim()
  .min(1)
  .max(30000)
  .refine(hasRichText, "Text cannot be empty");
const localizedRich = z
  .object({
    ar: richText,
    fr: z.string().trim().max(30000).optional(),
  })
  .strict()
  .transform(({ ar, fr }) => ({ ar, fr: fr && hasRichText(fr) ? fr : ar }));
const richBody = z.union([paragraphs, localizedRich]);
const isoDate = z.iso.date();
const isoDateTime = z.iso.datetime({ offset: true });
const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const imageId = z.string().uuid().nullable().optional();

const common = {
  category: localized,
  title: localized,
  excerpt: localizedRich,
  body: richBody,
  imageId,
  status: z.enum(["draft", "published"]),
};

export const schemas = {
  announcements: z.object({ ...common, publishedAt: isoDate }).strict(),
  events: z
    .object({
      ...common,
      startsAt: isoDateTime,
      endsAt: isoDateTime,
      location: localized,
    })
    .strict()
    .refine((value) => Date.parse(value.endsAt) > Date.parse(value.startsAt), {
      message: "End time must be after start time",
      path: ["endsAt"],
    }),
  classes: z
    .object({
      day: z.number().int().min(1).max(7),
      startsAt: clock,
      endsAt: clock,
      subject: localized,
      audience: localized,
      instructor: localized,
      room: localized,
      level: localized,
      status: z.enum(["draft", "published"]),
    })
    .strict()
    .refine((value) => value.endsAt > value.startsAt, {
      message: "End time must be after start time",
      path: ["endsAt"],
    }),
};

export const organizationSchema = z
  .object({
    name: localized,
    shortName: localized,
    tagline: localized,
    mission: localizedRich,
    description: localizedRich,
    facebookUrl: z.url().startsWith("https://www.facebook.com/"),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z
      .email()
      .max(320)
      .transform((value) => value.trim().toLowerCase()),
    password: z.string().min(1),
  })
  .strict();

export function validate(schema, value) {
  const result = schema.safeParse(value);
  if (result.success) return { value: result.data };
  return {
    error: result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  };
}
