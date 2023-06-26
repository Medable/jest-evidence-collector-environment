describe("sum", () => {
  it("#ABC-T45667 can add two numbers together", async function() {
    collectEvidence("result date from calling service", {a: "b"})
    const a = 'b'
    collectEvidence("value transformed", a)
    expect(1+1).toBe(2);
    
  });

  it("can add two numbers ABC-T488,ABC-T188 together", async function() {
    collectEvidence("result date from calling service",{a: "c"}, 'Text')
    expect(1+1).toBe(2);
    collectEvidence("another evidence only for ABC-T188 ",{a: "c"}, 'Image', 'ABC-T188')
  });

  it("#ABC-T489 can add two numbers together", async function() {
    collectEvidence("result date from calling service",{a: "d"})
    expect(1+1).toBe(1);
    
  });
});