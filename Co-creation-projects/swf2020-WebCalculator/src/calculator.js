const OP_DISPLAY = { "/": "÷", "*": "×" };
const OP_INTERNAL = { "÷": "/", "×": "*" };

export class Calculator {
  constructor() {
    this.display = "0";
    this._expression = "";
    this._waitingForOperand = false;
    this._afterEquals = false;
    this._lastResult = null;
  }

  press(key) {
    if (key >= "0" && key <= "9") {
      if (this._afterEquals) {
        this._expression = key;
        this.display = key;
        this._afterEquals = false;
        this._lastResult = null;
      } else if (this._waitingForOperand) {
        if (this._operator === "/" && key === "0") return;
        this._expression += key;
        this.display = this._expression;
        this._waitingForOperand = false;
      } else if (this._expression === "" || this._expression === "0") {
        this._expression = key;
        this.display = key;
      } else {
        this._expression += key;
        this.display = this._expression;
      }
    } else if (key === ".") {
      if (this._afterEquals) {
        this._expression = "0.";
        this.display = "0.";
        this._afterEquals = false;
        this._lastResult = null;
      } else if (this._waitingForOperand) {
        this._expression += "0.";
        this.display = this._expression;
        this._waitingForOperand = false;
      } else {
        const norm = this._normalize(this._expression);
        const lastNumber = norm.split(/[\+\-\*\/]/).pop();
        if (!lastNumber.includes(".")) {
          const lastChar = this._expression.slice(-1);
          if (lastChar >= "0" && lastChar <= "9") {
            this._expression += ".";
          } else {
            this._expression += "0.";
          }
          this.display = this._expression;
        }
      }
    } else if (key === "+" || key === "-" || key === "*" || key === "/") {
      if (this._expression === "" || this._expression === "0") return;
      if (this._afterEquals && this._lastResult !== null) {
        this._expression = this._formatResult(this._lastResult);
        this._afterEquals = false;
      }
      const displayKey = OP_DISPLAY[key] || key;
      if (this._waitingForOperand) {
        this._expression = this._expression.slice(0, -1) + displayKey;
      } else {
        this._expression += displayKey;
      }
      this.display = this._expression;
      this._operator = key;
      this._waitingForOperand = true;
    } else if (key === "=") {
      if (this._waitingForOperand) return;
      const result = this._evaluate(this._expression);
      if (result === null) return;
      this.display = this._expression + "\n=" + this._formatResult(result);
      this._expression = this.display;
      this._lastResult = result;
      this._afterEquals = true;
      this._waitingForOperand = false;
    } else if (key === "C") {
      this.display = "0";
      this._expression = "";
      this._lastResult = null;
      this._waitingForOperand = false;
      this._afterEquals = false;
    } else if (key === "DEL") {
      if (this._afterEquals) {
        this.display = "0";
        this._expression = "";
        this._lastResult = null;
        this._waitingForOperand = false;
        this._afterEquals = false;
        return;
      }
      if (this._expression === "" || this._expression === "0") return;
      const removed = this._expression.slice(-1);
      this._expression = this._expression.slice(0, -1);
      if (this._expression === "") {
        this.display = "0";
        this._waitingForOperand = false;
      } else {
        this.display = this._expression;
        if (removed === "+" || removed === "-" || removed === "×" || removed === "÷") {
          this._waitingForOperand = false;
        }
      }
    }
  }

  _normalize(expr) {
    let result = expr;
    for (const [display, internal] of Object.entries(OP_INTERNAL)) {
      result = result.replaceAll(display, internal);
    }
    return result;
  }

  _formatResult(num) {
    const rounded = Math.round(num * 10000) / 10000;
    return String(rounded);
  }

  _evaluate(expr) {
    const normalized = this._normalize(expr);
    const tokens = normalized.match(/(\d+\.?\d*|[+\-*/])/g);
    if (!tokens) return null;

    let result = parseFloat(tokens[0]);
    let i = 1;
    while (i < tokens.length) {
      const op = tokens[i];
      const num = parseFloat(tokens[i + 1]);
      if (isNaN(num)) return null;

      if (op === "+") result += num;
      else if (op === "-") result -= num;
      else if (op === "*") result *= num;
      else if (op === "/") {
        if (num === 0) return null;
        result /= num;
      }
      i += 2;
    }
    return result;
  }
}
