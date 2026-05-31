import { Calculator } from "./calculator.js";

const display = document.getElementById("display");
const calc = new Calculator();

function updateDisplay() {
  const text = calc.display;

  if (text.includes("\n")) {
    const [expr, result] = text.split("\n");
    display.innerHTML =
      `<span class="display-expr">${escapeHtml(expr)}</span>` +
      `<span class="display-result">${escapeHtml(result)}</span>`;
  } else {
    display.innerHTML = `<span class="display-expr">${escapeHtml(text)}</span>`;
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

document.querySelectorAll(".btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.key;
    calc.press(key);
    updateDisplay();
  });
});

document.addEventListener("keydown", (e) => {
  const keyMap = {
    Enter: "=",
    Escape: "C",
    Backspace: "DEL",
    c: "C",
    C: "C",
    x: "*",
    X: "*",
  };

  const key = keyMap[e.key] || e.key;

  if (
    (key >= "0" && key <= "9") ||
    key === "+" ||
    key === "-" ||
    key === "*" ||
    key === "/" ||
    key === "." ||
    key === "=" ||
    key === "C" ||
    key === "DEL"
  ) {
    e.preventDefault();
    calc.press(key);
    updateDisplay();
  }
});

updateDisplay();
