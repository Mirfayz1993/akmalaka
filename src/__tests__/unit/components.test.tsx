import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

// ─── Modal testi ─────────────────────────────────────────────────────────────

describe("Modal komponenti", () => {
  it("yopiq bo'lganda hech narsa ko'rsatmaydi", () => {
    const { container } = render(
      <Modal isOpen={false} onClose={() => {}} title="Test">
        <p>Kontent</p>
      </Modal>
    );
    expect(container.firstChild).toBeNull();
  });

  it("ochiq bo'lganda sarlavha ko'rsatadi", () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Vagon yaratish">
        <p>Kontent</p>
      </Modal>
    );
    expect(screen.getByText("Vagon yaratish")).toBeTruthy();
  });

  it("ochiq bo'lganda kontentni ko'rsatadi", () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test">
        <p>Modal ichidagi kontent</p>
      </Modal>
    );
    expect(screen.getByText("Modal ichidagi kontent")).toBeTruthy();
  });

  it("X tugmasini bosish onClose ni chaqiradi", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test">
        <p>Kontent</p>
      </Modal>
    );
    // X tugmasini topish
    const closeBtn = screen.getAllByRole("button").find(
      (btn) => btn.querySelector("svg") !== null
    );
    expect(closeBtn).toBeTruthy();
    fireEvent.click(closeBtn!);
    expect(onClose).toHaveBeenCalledOnce();
  });
});

// ─── ConfirmDialog testi ──────────────────────────────────────────────────────

describe("ConfirmDialog komponenti", () => {
  it("ochiq bo'lganda xabarni ko'rsatadi", () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={() => {}}
        onConfirm={() => {}}
        title="O'chirish"
        message="Haqiqatan ham o'chirasizmi?"
        confirmText="O'chirish"
      />
    );
    expect(screen.getByText("Haqiqatan ham o'chirasizmi?")).toBeTruthy();
  });

  it("Bekor qilish tugmasi onClose ni chaqiradi", () => {
    const onClose = vi.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={onClose}
        onConfirm={() => {}}
        title="O'chirish"
        message="Tasdiqlaysizmi?"
        confirmText="O'chirish"
      />
    );
    fireEvent.click(screen.getByText("Bekor qilish"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("Tasdiqlash tugmasi onConfirm ni chaqiradi", () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={() => {}}
        onConfirm={onConfirm}
        title="Tasdiqlash"
        message="Tasdiqlaysizmi?"
        confirmText="Ha, o'chirish"
      />
    );
    fireEvent.click(screen.getByText("Ha, o'chirish"));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("yuklanayotganda tugmalar disabled bo'ladi", () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={() => {}}
        onConfirm={() => {}}
        title="Tasdiqlash"
        message="Tasdiqlaysizmi?"
        confirmText="Ha, bajarish"
        isLoading={true}
      />
    );
    // Faqat action tugmalarini tekshiramiz (X tugmasini emas)
    expect(screen.getByText("Bekor qilish")).toBeDisabled();
    expect(screen.getByText("Yuklanmoqda...")).toBeDisabled();
  });
});
