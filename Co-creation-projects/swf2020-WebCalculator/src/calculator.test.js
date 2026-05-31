import { describe, it, expect } from "vitest";
import { Calculator } from "./calculator.js";

describe("Calculator", () => {
  it("displays a single digit when pressed", () => {
    const calc = new Calculator();
    calc.press("5");
    expect(calc.display).toBe("5");
  });

  it("concatenates multiple digits", () => {
    const calc = new Calculator();
    calc.press("1");
    calc.press("2");
    calc.press("3");
    expect(calc.display).toBe("123");
  });

  it("shows full expression with result on new line", () => {
    const calc = new Calculator();
    calc.press("1");
    calc.press("2");
    calc.press("+");
    calc.press("3");
    calc.press("=");
    expect(calc.display).toBe("12+3\n=15");
  });

  it("shows subtraction expression with result", () => {
    const calc = new Calculator();
    calc.press("1");
    calc.press("0");
    calc.press("-");
    calc.press("4");
    calc.press("=");
    expect(calc.display).toBe("10-4\n=6");
  });

  it("shows multiplication expression with result", () => {
    const calc = new Calculator();
    calc.press("3");
    calc.press("*");
    calc.press("7");
    calc.press("=");
    expect(calc.display).toBe("3×7\n=21");
  });

  it("shows division expression with result", () => {
    const calc = new Calculator();
    calc.press("1");
    calc.press("5");
    calc.press("/");
    calc.press("3");
    calc.press("=");
    expect(calc.display).toBe("15÷3\n=5");
  });

  it("shows chained operations in full expression", () => {
    const calc = new Calculator();
    calc.press("1");
    calc.press("+");
    calc.press("2");
    calc.press("+");
    calc.press("3");
    calc.press("=");
    expect(calc.display).toBe("1+2+3\n=6");
  });

  it("clears the display", () => {
    const calc = new Calculator();
    calc.press("5");
    calc.press("C");
    expect(calc.display).toBe("0");
  });

  it("shows decimal numbers in expression", () => {
    const calc = new Calculator();
    calc.press("1");
    calc.press(".");
    calc.press("5");
    calc.press("+");
    calc.press("2");
    calc.press(".");
    calc.press("3");
    calc.press("=");
    expect(calc.display).toBe("1.5+2.3\n=3.8");
  });

  it("starts new expression after equals when digit pressed", () => {
    const calc = new Calculator();
    calc.press("3");
    calc.press("+");
    calc.press("4");
    calc.press("=");
    calc.press("9");
    expect(calc.display).toBe("9");
  });

  it("continues expression after operator chaining without equals", () => {
    const calc = new Calculator();
    calc.press("1");
    calc.press("+");
    calc.press("2");
    calc.press("-");
    calc.press("3");
    calc.press("=");
    expect(calc.display).toBe("1+2-3\n=0");
  });

  it("ignores operator at the start", () => {
    const calc = new Calculator();
    calc.press("/");
    expect(calc.display).toBe("0");
  });

  it("ignores operator at the start and allows valid input after", () => {
    const calc = new Calculator();
    calc.press("/");
    calc.press("*");
    calc.press("-");
    calc.press("5");
    expect(calc.display).toBe("5");
  });

  it("blocks zero after division operator", () => {
    const calc = new Calculator();
    calc.press("5");
    calc.press("/");
    calc.press("0");
    expect(calc.display).toBe("5÷");
  });

  it("allows zero after non-division operators", () => {
    const calc = new Calculator();
    calc.press("5");
    calc.press("+");
    calc.press("0");
    expect(calc.display).toBe("5+0");
  });

  it("allows decimal starting with zero after division operator", () => {
    const calc = new Calculator();
    calc.press("5");
    calc.press("/");
    calc.press(".");
    calc.press("5");
    calc.press("=");
    expect(calc.display).toBe("5÷0.5\n=10");
  });

  it("ignores equals when expression ends with operator", () => {
    const calc = new Calculator();
    calc.press("5");
    calc.press("+");
    calc.press("=");
    expect(calc.display).toBe("5+");
  });

  it("rounds result to 4 decimal places for repeating decimal", () => {
    const calc = new Calculator();
    calc.press("1");
    calc.press("/");
    calc.press("3");
    calc.press("=");
    expect(calc.display).toBe("1÷3\n=0.3333");
  });

  it("rounds up result to 4 decimal places", () => {
    const calc = new Calculator();
    calc.press("1");
    calc.press("/");
    calc.press("6");
    calc.press("=");
    expect(calc.display).toBe("1÷6\n=0.1667");
  });

  it("keeps integer result without decimal point", () => {
    const calc = new Calculator();
    calc.press("6");
    calc.press("/");
    calc.press("2");
    calc.press("=");
    expect(calc.display).toBe("6÷2\n=3");
  });

  it("does not pad exact decimal with trailing zeros", () => {
    const calc = new Calculator();
    calc.press("1");
    calc.press("/");
    calc.press("2");
    calc.press("=");
    expect(calc.display).toBe("1÷2\n=0.5");
  });

  it("rounds chained operation result to 4 decimal places", () => {
    const calc = new Calculator();
    calc.press("2");
    calc.press("/");
    calc.press("3");
    calc.press("+");
    calc.press("1");
    calc.press("=");
    expect(calc.display).toBe("2÷3+1\n=1.6667");
  });

  it("preserves 4 decimal precision when continuing after equals with operator", () => {
    const calc = new Calculator();
    calc.press("1");
    calc.press("/");
    calc.press("3");
    calc.press("=");
    calc.press("+");
    calc.press("1");
    calc.press("=");
    expect(calc.display).toBe("0.3333+1\n=1.3333");
  });

  it("backspace removes last digit from multi-digit number", () => {
    const calc = new Calculator();
    calc.press("4");
    calc.press("5");
    calc.press("DEL");
    expect(calc.display).toBe("4");
  });

  it("backspace on single digit resets to zero", () => {
    const calc = new Calculator();
    calc.press("4");
    calc.press("DEL");
    expect(calc.display).toBe("0");
  });

  it("backspace removes trailing operator", () => {
    const calc = new Calculator();
    calc.press("4");
    calc.press("5");
    calc.press("+");
    calc.press("DEL");
    expect(calc.display).toBe("45");
  });

  it("backspace clears result and starts fresh", () => {
    const calc = new Calculator();
    calc.press("3");
    calc.press("+");
    calc.press("4");
    calc.press("=");
    calc.press("DEL");
    expect(calc.display).toBe("0");
  });
});
