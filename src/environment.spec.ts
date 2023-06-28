import { Circus } from '@jest/types';
import {CustomEnvironment} from './environment';
import { Collector } from './collector';
/* eslint-disable @typescript-eslint/no-unused-vars */
import { getMicroTime } from './utils';
import { EnvironmentContext, JestEnvironmentConfig } from '@jest/environment';
import { Evidence, EvidenceError, EvidenceTypeEnum } from './types';

jest.mock('./collector');
jest.mock('./utils');

describe('customEnvironment', () => {
  let customEnvironment: CustomEnvironment;
  let mockCollector: Collector;
  let mockGetMicroTime: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCollector = {
      getTestCase: jest.fn(),
      addEvidence: jest.fn(),
      extractTestCase: jest.fn(),
      addTestCase: jest.fn(),
      updateTestStatus: jest.fn(),
      endCollecting: jest.fn(),
    } as unknown as Collector;

    mockGetMicroTime = jest.fn().mockReturnValue(123456789.823);
    (getMicroTime as jest.Mock) = mockGetMicroTime;

    (Collector.getInstance as jest.Mock) = jest.fn().mockReturnValue(mockCollector);

    const config = {
      projectConfig: {
        testEnvironmentOptions: {
          enabled: true,
          output: {
            folder: './evidence',
            file: 'results.json',
          },
        },
      },
    } as any as JestEnvironmentConfig;
    const context = {
      docblockPragmas: {
        pragma1: 'value1',
        pragma2: ['value2', 'value3'],
      },
      testPath: '/path/to/test',
    } as any as EnvironmentContext;
    customEnvironment = new CustomEnvironment(config, context);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create an instance of customEnvironment', () => {
      expect(customEnvironment).toBeInstanceOf(CustomEnvironment);
    });

    it('should initialize the collector with the correct options', () => {
      const expectedOptions = {
        enabled: true,
        output: {
          folder: './evidence',
          file: 'results.json',
        },
      };
      expect(Collector.getInstance).toHaveBeenCalledWith(expectedOptions);
    });

    it('should set the collectAsImage function in the global object', () => {
      expect(customEnvironment.global.collectAsImage).toBeDefined();
    });
    it('should set the collectAsText function in the global object', () => {
      expect(customEnvironment.global.collectAsText).toBeDefined();
    });
    it('should set the collectError function in the global object', () => {
      expect(customEnvironment.global.collectError).toBeDefined();
    });
  });

  describe('collectAsText', () => {
    it('should add text evidence to the collector', () => {
      const tc = { id: 'testId' }
      customEnvironment.collector.getTestCase = jest.fn().mockReturnValue(tc)
      customEnvironment.collector.addEvidence = jest.fn()

      const description = 'Test description'
      const data = 'Test data'
      const identifier = 'Test identifier'
      customEnvironment.collectAsText(description, data, identifier)

      expect(customEnvironment.collector.getTestCase).toHaveBeenCalledWith(undefined) // testId is undefined initially
      expect(customEnvironment.collector.addEvidence).toHaveBeenCalledWith(tc, new Evidence({
        description,
        data,
        collectedAt: expect.any(Number),
        type: EvidenceTypeEnum.TEXT,
        identifier,
      }))
    })

    it('should not add evidence if test case is not found', () => {
      customEnvironment.collector.getTestCase = jest.fn().mockReturnValue(undefined)
      customEnvironment.collector.addEvidence = jest.fn()

      const description = 'Test description'
      const data = 'Test data'
      const identifier = 'Test identifier'
      customEnvironment.collectAsText(description, data, identifier)

      expect(customEnvironment.collector.getTestCase).toHaveBeenCalledWith(undefined) // testId is undefined initially
      expect(customEnvironment.collector.addEvidence).not.toHaveBeenCalled()
    })
  })

  describe('collectAsImage', () => {
    it('should add image evidence to the collector', () => {
      const tc = { id: 'testId' }
      customEnvironment.collector.getTestCase = jest.fn().mockReturnValue(tc)
      customEnvironment.collector.addEvidence = jest.fn()

      const description = 'Test description'
      const data = 'Test data'
      const identifier = 'Test identifier'
      customEnvironment.collectAsImage(description, data, identifier)

      expect(customEnvironment.collector.getTestCase).toHaveBeenCalledWith(undefined) // testId is undefined initially
      expect(customEnvironment.collector.addEvidence).toHaveBeenCalledWith(tc, new Evidence({
        description,
        data,
        collectedAt: expect.any(Number),
        type: EvidenceTypeEnum.IMAGE,
        identifier,
      }))
    })

    it('should not add evidence if test case is not found', () => {
      customEnvironment.collector.getTestCase = jest.fn().mockReturnValue(undefined)
      customEnvironment.collector.addEvidence = jest.fn()

      const description = 'Test description'
      const data = 'Test data'
      const identifier = 'Test identifier'
      customEnvironment.collectAsImage(description, data, identifier)

      expect(customEnvironment.collector.getTestCase).toHaveBeenCalledWith(undefined) // testId is undefined initially
      expect(customEnvironment.collector.addEvidence).not.toHaveBeenCalled()
    })
  })

  describe('collectError', () => {
    it('should add error evidence to the collector', () => {
      const tc = { id: 'testId' }
      customEnvironment.collector.getTestCase = jest.fn().mockReturnValue(tc)
      customEnvironment.collector.addEvidence = jest.fn()

      const error = new Error('Test error')
      const identifier = 'Test identifier'
      customEnvironment.collectError(error, EvidenceTypeEnum.TEXT, identifier)

      expect(customEnvironment.collector.getTestCase).toHaveBeenCalledWith(undefined) // testId is undefined initially
      expect(customEnvironment.collector.addEvidence).toHaveBeenCalledWith(tc, new EvidenceError({
        message: error.message,
        stack: error.stack,
        collectedAt: expect.any(Number),
        identifier,
        type: EvidenceTypeEnum.TEXT
      }))
    })

    it('should not add evidence if test case is not found', () => {
      customEnvironment.collector.getTestCase = jest.fn().mockReturnValue(undefined)
      customEnvironment.collector.addEvidence = jest.fn()

      const error = new Error('Test error')
      const identifier = 'Test identifier'
      customEnvironment.collectError(error, EvidenceTypeEnum.TEXT, identifier)

      expect(customEnvironment.collector.getTestCase).toHaveBeenCalledWith(undefined) // testId is undefined initially
      expect(customEnvironment.collector.addEvidence).not.toHaveBeenCalled()
    })
  })

  describe('startTest', () => {
    it('should add a new test case to the collector', () => {
      const mockAddTestCase = jest.spyOn(mockCollector, 'addTestCase');
      jest.spyOn(mockCollector, 'extractTestCase').mockReturnValue(['myProject.TestCase1'])
      const state = {
        currentlyRunningTest: {
          name: 'myProject.TestCase1',
          startedAt: 1624487678000,
        },
      } as unknown as Circus.State;

      customEnvironment.startTest(state);

      expect(mockAddTestCase).toHaveBeenCalledWith(
        expect.objectContaining({
          multipleIdentifiers: false,
          identifier: 'myProject.TestCase1',
          started: new Date(1624487678000),
        })
      );
    });

    it('should log a warning if the test case name is missing', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const state = {
        currentlyRunningTest: {
          name: 'Unnamed test',
          startedAt: 1624487678000,
        },
      } as unknown as Circus.State;

      customEnvironment.startTest(state);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Test: Unnamed test will be ignored for evidence collection missing test case name.'
      );
    });
  });

  describe('endTest', () => {
    it('should add error evidence if there are errors in the test', () => {
      const mockCollectError = jest.spyOn(customEnvironment, 'collectError');
      const state = {
        currentlyRunningTest: {
          errors: ['Error 1', 'Error 2'],
        },
      } as unknown as Circus.State;

      customEnvironment.endTest(state, false);
      const error = new Error('Error executing test')
      error.stack = JSON.stringify(state.currentlyRunningTest?.errors, null, 2)
      expect(mockCollectError).toHaveBeenCalledWith(error,
        EvidenceTypeEnum.IMAGE,
        customEnvironment.testId
      );
    });

    it('should update the test status in the collector', () => {
      const mockUpdateTestStatus = jest.spyOn(mockCollector, 'updateTestStatus');
      const state = {
        currentlyRunningTest: {},
      } as unknown as Circus.State;

      customEnvironment.endTest(state, true);

      expect(mockUpdateTestStatus).toHaveBeenCalledWith(customEnvironment.testId, 'Passed');
    });

    it('should update the test status as Failed if success is false', () => {
      const mockUpdateTestStatus = jest.spyOn(mockCollector, 'updateTestStatus');
      const state = {
        currentlyRunningTest: {},
      } as unknown as Circus.State;

      customEnvironment.endTest(state, false);

      expect(mockUpdateTestStatus).toHaveBeenCalledWith(customEnvironment.testId, 'Failed');
    });
  });

  describe('finish', () => {
    it('should end collecting in the collector', () => {
      const mockEndCollecting = jest.spyOn(mockCollector, 'endCollecting');

      customEnvironment.finish();

      expect(mockEndCollecting).toHaveBeenCalled();
    });
  });

  describe('handleTestEvent', () => {
    it('should handle the "setup" event', () => {
      const event = { name: 'setup' } as unknown as Circus.Event;

      customEnvironment.handleTestEvent(event, {} as Circus.State);

      expect(mockCollector.endCollecting).not.toHaveBeenCalled();
    });

    it('should handle the "test_fn_start" event', () => {
      const event = { name: 'test_fn_start' } as unknown as Circus.Event;
      const state = { currentlyRunningTest: { name: 'myProject.TestCase1' } } as unknown as Circus.State;
      const mockStartTest = jest.spyOn(customEnvironment, 'startTest');

      customEnvironment.handleTestEvent(event, state);

      expect(mockStartTest).toHaveBeenCalledWith(state);
    });

    it('should handle the "test_fn_success" event', () => {
      const event = { name: 'test_fn_success' } as unknown as Circus.Event;
      const state = { currentlyRunningTest: {} } as unknown as Circus.State;
      const mockEndTest = jest.spyOn(customEnvironment, 'endTest');

      customEnvironment.handleTestEvent(event, state);

      expect(mockEndTest).toHaveBeenCalledWith(state, true);
    });

    it('should handle the "test_fn_failure" event', () => {
      const event = { name: 'test_fn_failure' } as unknown as Circus.Event;
      const state = { currentlyRunningTest: {} } as unknown as Circus.State;
      const mockEndTest = jest.spyOn(customEnvironment, 'endTest');

      customEnvironment.handleTestEvent(event, state);

      expect(mockEndTest).toHaveBeenCalledWith(state, false);
    });

    it('should handle the "teardown" event', () => {
      const event = { name: 'teardown' } as unknown as Circus.Event;

      customEnvironment.handleTestEvent(event, {} as Circus.State);

      expect(mockCollector.endCollecting).toHaveBeenCalled();
    });

    it('should handle the "error" event', () => {
      const event = { name: 'error' } as unknown as Circus.Event;

      customEnvironment.handleTestEvent(event, {} as Circus.State);

      expect(mockCollector.endCollecting).toHaveBeenCalled();
    });

    it('should handle unknown events', () => {
      const event = { name: 'unknown_event' } as unknown as Circus.Event;

      customEnvironment.handleTestEvent(event, {} as Circus.State);

      expect(mockCollector.endCollecting).not.toHaveBeenCalled();
    });
  });
});
