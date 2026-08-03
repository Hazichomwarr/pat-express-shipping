import { Package, Trash2 } from "lucide-react";

export type ShipmentItemFormValues = {
  id: number;
  description: string;
  category: string;
  quantity: string;
  declaredValue: string;
};

const CATEGORY_OPTIONS = [
  { value: "GENERAL", label: "Général" },
  { value: "CLOTHING", label: "Vêtements" },
  { value: "ELECTRONICS", label: "Électronique" },
  { value: "DOCUMENTS", label: "Documents" },
  { value: "FOOD", label: "Produits alimentaires" },
  { value: "HOUSEHOLD", label: "Articles ménagers" },
  { value: "COMMERCIAL_GOODS", label: "Marchandises commerciales" },
  { value: "OTHER", label: "Autre" },
] as const;

const inputClassName =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-base text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 aria-invalid:border-red-500 aria-invalid:ring-red-100";

type ShipmentItemFieldsProps = {
  index: number;
  item: ShipmentItemFormValues;
  itemCount: number;
  fieldErrors: Record<string, string[]>;
  onChange: (
    id: number,
    field: Exclude<keyof ShipmentItemFormValues, "id">,
    value: string,
  ) => void;
  onRemove: (id: number) => void;
};

function FieldError({
  errors,
  id,
}: {
  errors: string[] | undefined;
  id: string;
}) {
  if (!errors?.length) {
    return null;
  }

  return (
    <div id={id} className="mt-2 space-y-1" role="alert">
      {errors.slice(0, 1).map((error) => (
        <p key={error} className="text-sm font-medium text-red-700">
          {error}
        </p>
      ))}
    </div>
  );
}

export default function ShipmentItemFields({
  index,
  item,
  itemCount,
  fieldErrors,
  onChange,
  onRemove,
}: ShipmentItemFieldsProps) {
  const fieldPath = (field: string) => `items.${index}.${field}`;
  const errorId = (field: string) => `items-${index}-${field}-error`;
  const errorsFor = (field: string) => fieldErrors[fieldPath(field)];

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <Package aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
              Article {index + 1}
            </p>
            <h3 className="text-lg font-bold text-slate-950">
              Contenu déclaré
            </h3>
          </div>
        </div>

        {itemCount > 1 ? (
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-100"
            aria-label={`Retirer l’article ${index + 1}`}
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            <span className="hidden sm:inline">Retirer</span>
          </button>
        ) : null}
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <label
            htmlFor={`items-${index}-description`}
            className="text-sm font-bold text-slate-800"
          >
            Description
          </label>
          <input
            id={`items-${index}-description`}
            name={fieldPath("description")}
            value={item.description}
            onChange={(event) =>
              onChange(item.id, "description", event.target.value)
            }
            maxLength={200}
            placeholder="Ex. Ordinateur portable"
            className={inputClassName}
            aria-invalid={Boolean(errorsFor("description"))}
            aria-describedby={
              errorsFor("description") ? errorId("description") : undefined
            }
          />
          <FieldError
            errors={errorsFor("description")}
            id={errorId("description")}
          />
        </div>

        <div>
          <label
            htmlFor={`items-${index}-category`}
            className="text-sm font-bold text-slate-800"
          >
            Catégorie
          </label>
          <select
            id={`items-${index}-category`}
            name={fieldPath("category")}
            value={item.category}
            onChange={(event) =>
              onChange(item.id, "category", event.target.value)
            }
            className={inputClassName}
            aria-invalid={Boolean(errorsFor("category"))}
            aria-describedby={
              errorsFor("category") ? errorId("category") : undefined
            }
          >
            <option value="">Choisissez une catégorie</option>
            {CATEGORY_OPTIONS.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
          <FieldError
            errors={errorsFor("category")}
            id={errorId("category")}
          />
        </div>

        <div>
          <label
            htmlFor={`items-${index}-quantity`}
            className="text-sm font-bold text-slate-800"
          >
            Quantité
          </label>
          <input
            id={`items-${index}-quantity`}
            name={fieldPath("quantity")}
            type="number"
            inputMode="numeric"
            min={1}
            max={999}
            step={1}
            value={item.quantity}
            onChange={(event) =>
              onChange(item.id, "quantity", event.target.value)
            }
            className={inputClassName}
            aria-invalid={Boolean(errorsFor("quantity"))}
            aria-describedby={
              errorsFor("quantity") ? errorId("quantity") : undefined
            }
          />
          <FieldError
            errors={errorsFor("quantity")}
            id={errorId("quantity")}
          />
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor={`items-${index}-declared-value`}
            className="text-sm font-bold text-slate-800"
          >
            Valeur déclarée — facultatif
          </label>
          <input
            id={`items-${index}-declared-value`}
            name={fieldPath("declaredValue")}
            type="text"
            inputMode="decimal"
            value={item.declaredValue}
            onChange={(event) =>
              onChange(item.id, "declaredValue", event.target.value)
            }
            placeholder="Ex. 149.99"
            className={inputClassName}
            aria-invalid={Boolean(errorsFor("declaredValue"))}
            aria-describedby={
              errorsFor("declaredValue")
                ? `${errorId("declaredValue")} items-${index}-declared-value-help`
                : `items-${index}-declared-value-help`
            }
          />
          <p
            id={`items-${index}-declared-value-help`}
            className="mt-2 text-sm leading-6 text-slate-500"
          >
            Indiquez la valeur approximative de l’article, si vous la
            connaissez.
          </p>
          <FieldError
            errors={errorsFor("declaredValue")}
            id={errorId("declaredValue")}
          />
        </div>
      </div>
    </article>
  );
}
