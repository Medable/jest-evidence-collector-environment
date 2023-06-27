describe("sum", () => {
  it("#ABC-T45667 can add two numbers together", async function() {
    collectAsImage("result date from calling service", {a: "b"})
    const a = 'b'
    collectAsImage("value transformed", a)
    expect(1+1).toBe(2);
    
  });

  it("can add two numbers ABC-T488,ABC-T188 together", async function() {
    collectAsText("result date from calling service",{a: "c"})
    expect(1+1).toBe(2);
    collectAsImage("another evidence only for ABC-T188 ",{a: "c"}, 'ABC-T188')
  });

  it("#ABC-T489 can add two numbers together", async function() {
    collectAsImage("result date from calling service",{a: "d"})
    expect(1+1).toBe(1);
    
  });

  it('collect evidence for ABC-T147', () => {
    collectAsImage('this is an image', {
      "result": {
        text: "This is a json result collected",
        number: 1234,
        date: new Date().toISOString()
      }
    })
    expect(1+1).toBe(2)
    collectAsText('this is an evidence collected as text', "Text data")
    // collect error as well
    collectError(new Error('This is an error'), 'text')
  });

  it('collect evidence for multiple tests ABC-T147, ABC-T148', () => {
    collectAsImage('this is an image', {
      "result": {
        text: "lorem impsum at dole",
        number: 1234,
        date: new Date().toISOString()
      }
    })
    expect(1+1).toBe(2)
    collectAsText('this is an evidence collected as text', "this data is only for ABC-T148", 'ABC-T148')
  });
});