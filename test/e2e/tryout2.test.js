describe("sum 2", () => {
  it("#ABC-T45777 1 can add two numbers together", async function() {
    collectAsImage("result date from calling service 2", {a: "b"})
    const a = 'b'
    collectAsImage("value transformed 2", a)
    expect(1+1).toBe(2);
    
  });
});