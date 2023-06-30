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
    collectAsImage("result date from calling service", {a: "b"})
    const a = 'b'
    collectAsImage("value transformed", a)
    expect(1+1).toBe(2);
    
  });

  it("can add two numbers DCT-T488,DCT-T188 together", async function() {
    collectAsImage("result date from calling service",{a: "c"}) // apply to both TC
    expect(1+1).toBe(2);
    collectAsImage("everything ok", {success: true}, "DCT-T188") // this will be collected only for that TC
    
  });

  it("#DCT-T489 can add two numbers together", async function() {
    collectAsImage("result date from calling service",{a: "d"})
    expect(1+1).toBe(1);
    
  });
});

```

therea are some functions that exists globaly so you can use inside tests and it will collect all evidence related with the context you have.
the signatures are the following:
```
collectAsImage(description: string, data: any, type: EvidenceTypeEnum, identifier?:string) : void
collectAsText(description: string, data: any, type: EvidenceTypeEnum, identifier?:string) : void
collectError(err: Error, identifier?:string) : void
```
Note: if you are using typescript add the following header to access the types
```
/// <reference types="@medable/jest-evidence-collector-environment" />
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