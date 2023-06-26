# Jest Evidence Collector Environment

This enviroment will let you collect evidence and produce a report that later can be upload to zephyr in Jira.

## Dependecies

Mostly depends on Jest packages, but an extra package was added to convert to images the results.

- ultimate-text-to-image

### How to use it

First we need to install it.
```
npm install @medable/jest-evidence-collector-environment
```

Then you need to cofigure your jest implementation
```
module.exports = {
  testEnvironment: 'jest-evidence-collector-environment',
  testEnvironmentOptions: {
    project: "DCT",
    header: "Scheduler" // this will be added as a header of each collected evidence
    output: {
      folder: './evidence',
      file: 'results.json'
    }
  }
};
```

### How to write the tests to collect evidence

Here we have a couple of tests
```
describe("sum", () => {
  it("#DCT-T45667 can add two numbers together", async function() {
    collectEvidence("result date from calling service", {a: "b"})
    const a = 'b'
    collectEvidence("value transformed", a)
    expect(1+1).toBe(2);
    
  });

  it("can add two numbers DCT-T488,DCT-T188 together", async function() {
    collectEvidence("result date from calling service",{a: "c"}) // apply to both TC
    expect(1+1).toBe(2);
    collectEvidence("everything ok", {success: true}, "DCT-T188") // this will be collected only for that TC
    
  });

  it("#DCT-T489 can add two numbers together", async function() {
    collectEvidence("result date from calling service",{a: "d"})
    expect(1+1).toBe(1);
    
  });
});

```

collectEvidence exists globaly so you can add there and it will collect all evidence related with the context you have.
its signature is the following:
```
collectEvidence(description: string, data: any, identifier?:string) : void
```

### Run Tests

Test of the module it self

```
npm test
```

To run E2E testing (which execute tests using this envorinment)

```
npm run test:e2e
```