import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExampleWidget } from "../ExampleWidget";

describe("ExampleWidget", () => {
  it("renderar widgeten med initialt värde 0", () => {
    render(<ExampleWidget />);
    expect(screen.getByText("Systemarkitektur & Mall")).toBeInTheDocument();
    expect(screen.getByTestId("count-value")).toHaveTextContent("0");
  });

  it("ökar räknaren vid användarinteraktion", () => {
    render(<ExampleWidget />);
    const button = screen.getByRole("button", { name: /öka värde/i });
    fireEvent.click(button);
    expect(screen.getByTestId("count-value")).toHaveTextContent("1");
    fireEvent.click(button);
    expect(screen.getByTestId("count-value")).toHaveTextContent("2");
  });
});
