const math = require('mathjs');

describe('Numerical Engine Logic', () => {
  test('Correctly evaluates complex polynomial expressions', () => {
    const expr = 'x^3 - x - 2';
    expect(math.evaluate(expr, { x: 2 })).toBe(4);
    expect(math.evaluate(expr, { x: 1.521 })).toBeCloseTo(-0.0019, 3);
  });

  test('Computes exact symbolic derivatives for Newton Method', () => {
    const expr = 'x^3 - 2*x + 5';
    // f'(x) = 3x^2 - 2
    const dfNode = math.derivative(expr, 'x').compile();
    
    expect(dfNode.evaluate({ x: 0 })).toBe(-2);
    expect(dfNode.evaluate({ x: 2 })).toBe(10);
  });

  test('Handles trigonometric functions correctly', () => {
    const expr = 'cos(x) - x';
    expect(math.evaluate(expr, { x: 0 })).toBe(1);
    expect(math.evaluate(expr, { x: Math.PI / 2 })).toBeCloseTo(-Math.PI / 2, 5);
  });
});
