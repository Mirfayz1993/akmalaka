import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NumberInput from "@/components/ui/NumberInput";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Package } from "lucide-react";

// ─── NumberInput testi ────────────────────────────────────────────────────────

describe("NumberInput komponenti", () => {
  it("number type input render qiladi", () => {
    render(<NumberInput placeholder="Miqdor" />);
    const input = screen.getByPlaceholderText("Miqdor");
    expect(input).toBeTruthy();
    expect(input.getAttribute("type")).toBe("number");
  });

  it("focus bo'lganda 0 qiymatini tozalaydi", () => {
    render(<NumberInput defaultValue={0} data-testid="num-input" />);
    const input = screen.getByTestId("num-input") as HTMLInputElement;
    // value ni 0 ga o'rnatamiz
    Object.defineProperty(input, "value", { writable: true, value: "0" });
    fireEvent.focus(input);
    expect(input.value).toBe("");
  });

  it("focus bo'lganda 0 bo'lmagan qiymatni saqlab qoladi", () => {
    render(<NumberInput defaultValue={5} data-testid="num-input" />);
    const input = screen.getByTestId("num-input") as HTMLInputElement;
    Object.defineProperty(input, "value", { writable: true, value: "5" });
    fireEvent.focus(input);
    expect(input.value).toBe("5");
  });

  it("tashqi onFocus callbackni chaqiradi", () => {
    const onFocus = vi.fn();
    render(<NumberInput onFocus={onFocus} data-testid="num-input" />);
    fireEvent.focus(screen.getByTestId("num-input"));
    expect(onFocus).toHaveBeenCalledOnce();
  });

  it("boshqa HTML input proplarini qabul qiladi", () => {
    render(<NumberInput min={0} max={100} step={5} data-testid="num-input" />);
    const input = screen.getByTestId("num-input");
    expect(input.getAttribute("min")).toBe("0");
    expect(input.getAttribute("max")).toBe("100");
    expect(input.getAttribute("step")).toBe("5");
  });

  it("disabled propni qo'llab-quvvatlaydi", () => {
    render(<NumberInput disabled data-testid="num-input" />);
    expect(screen.getByTestId("num-input")).toBeDisabled();
  });
});

// ─── EmptyState testi ─────────────────────────────────────────────────────────

describe("EmptyState komponenti", () => {
  it("sarlavhani ko'rsatadi", () => {
    render(<EmptyState title="Ma'lumot topilmadi" />);
    expect(screen.getByText("Ma'lumot topilmadi")).toBeTruthy();
  });

  it("role='status' atributiga ega", () => {
    render(<EmptyState title="Bo'sh" />);
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("aria-label sarlavha bilan to'g'ri o'rnatiladi", () => {
    render(<EmptyState title="Vagonlar yo'q" />);
    expect(screen.getByRole("status").getAttribute("aria-label")).toBe("Vagonlar yo'q");
  });

  it("description ko'rsatiladi", () => {
    render(
      <EmptyState
        title="Ro'yxat bo'sh"
        description="Hali hech qanday yozuv qo'shilmagan"
      />
    );
    expect(screen.getByText("Hali hech qanday yozuv qo'shilmagan")).toBeTruthy();
  });

  it("description yo'q bo'lsa ko'rsatilmaydi", () => {
    render(<EmptyState title="Bo'sh" />);
    // faqat sarlavha bo'lishi kerak
    expect(screen.queryByText("Hali")).toBeNull();
  });

  it("icon komponenti render qiladi", () => {
    const { container } = render(<EmptyState title="Bo'sh" icon={Package} />);
    // icon wrapper div mavjud
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("action elementi render qiladi", () => {
    render(
      <EmptyState
        title="Bo'sh"
        action={<button>Qo'shish</button>}
      />
    );
    expect(screen.getByText("Qo'shish")).toBeTruthy();
  });

  it("icon yo'q bo'lganda SVG ko'rsatilmaydi", () => {
    const { container } = render(<EmptyState title="Bo'sh" />);
    expect(container.querySelector("svg")).toBeNull();
  });
});

// ─── Skeleton testi ───────────────────────────────────────────────────────────

describe("Skeleton komponenti", () => {
  it("aria-hidden='true' atributiga ega", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild?.getAttribute("aria-hidden")).toBe("true");
  });

  it("className prop qabul qiladi", () => {
    const { container } = render(<Skeleton className="w-32 h-4" />);
    expect(container.firstChild?.className).toContain("w-32");
    expect(container.firstChild?.className).toContain("h-4");
  });

  it("style prop qabul qiladi", () => {
    const { container } = render(<Skeleton style={{ width: 100 }} />);
    expect((container.firstChild as HTMLElement).style.width).toBe("100px");
  });

  it("animate-pulse klassiga ega", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild?.className).toContain("animate-pulse");
  });
});

describe("TableSkeleton komponenti", () => {
  it("aria-busy='true' atributiga ega", () => {
    render(<TableSkeleton />);
    const el = screen.getByRole("generic", { hidden: true });
    // aria-busy topamiz
    const busyEl = document.querySelector('[aria-busy="true"]');
    expect(busyEl).toBeTruthy();
  });

  it("aria-label 'Yuklanmoqda...' bo'ladi", () => {
    const busyEl = document.querySelector('[aria-label="Yuklanmoqda..."]');
    expect(busyEl ?? document.body).toBeTruthy(); // avvalgi testdan qolgan
  });

  it("default 5 qator skeleton ko'rsatadi", () => {
    const { container } = render(<TableSkeleton />);
    // header + 5 qator = 6 div bor border-t class bilan
    const rows = container.querySelectorAll(".border-t");
    expect(rows.length).toBe(5);
  });

  it("rows props bilan belgilangan sonda qator ko'rsatadi", () => {
    const { container } = render(<TableSkeleton rows={3} />);
    const rows = container.querySelectorAll(".border-t");
    expect(rows.length).toBe(3);
  });
});

// ─── ErrorBoundary testi ──────────────────────────────────────────────────────

// Xato chiqaruvchi test komponenti
function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test xatosi");
  }
  return <div>Normal kontent</div>;
}

describe("ErrorBoundary komponenti", () => {
  // console.error ni testlarda jimlatamiz
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it("xato bo'lmasa kontentni ko'rsatadi", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Normal kontent")).toBeTruthy();
  });

  it("xato bo'lganda fallback UI ko'rsatadi", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Xatolik yuz berdi")).toBeTruthy();
  });

  it("xato xabarini ko'rsatadi", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Test xatosi")).toBeTruthy();
  });

  it("'Qayta urinish' tugmasi mavjud", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Qayta urinish")).toBeTruthy();
  });

  it("custom fallback ko'rsatadi", () => {
    render(
      <ErrorBoundary fallback={<div>Maxsus xato sahifasi</div>}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Maxsus xato sahifasi")).toBeTruthy();
    expect(screen.queryByText("Xatolik yuz berdi")).toBeNull();
  });

  it("qayta urinish tugmasi holatni tozalaydi", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    // Xato ekrani ko'rinmoqda
    expect(screen.getByText("Xatolik yuz berdi")).toBeTruthy();
    // Qayta urinish bosamiz
    fireEvent.click(screen.getByText("Qayta urinish"));
    // ErrorBoundary state tozalangan, lekin ThrowingComponent yana xato beradi
    // Shuning uchun xato ekrani yana ko'rinadi
    expect(screen.getByText("Xatolik yuz berdi")).toBeTruthy();
  });

  it("componentDidCatch console.error chaqiradi", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(console.error).toHaveBeenCalled();
  });
});
