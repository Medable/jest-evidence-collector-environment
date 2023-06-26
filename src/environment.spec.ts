import { Circus } from '@jest/types';
import CustomEnvironment from './environment';
import { Collector } from './collector';
/* eslint-disable @typescript-eslint/no-unused-vars */
import { getMicroTime } from './utils';
import { EnvironmentContext, JestEnvironmentConfig } from '@jest/environment';
import { TestCase } from './types';

jest.mock('./collector');
jest.mock('./utils');

describe('CustomEnvironment', () => {
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

    mockGetMicroTime = jest.fn().mockReturnValue('2023-06-23T12:00:00.000Z');
    (getMicroTime as jest.Mock) = mockGetMicroTime;

    (Collector.getInstance as jest.Mock) = jest.fn().mockReturnValue(mockCollector);

    const config = {
      projectConfig: {
        testEnvironmentOptions: {
          enabled: true,
          outputEvidence: {
            folder: './evidence',
            file: 'results.json',
          },
        },
      },
    };
    const context = {
      docblockPragmas: {
        pragma1: 'value1',
        pragma2: ['value2', 'value3'],
      },
      testPath: '/path/to/test',
    };
    customEnvironment = new CustomEnvironment(config as unknown as JestEnvironmentConfig, context as unknown as EnvironmentContext);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create an instance of CustomEnvironment', () => {
      expect(customEnvironment).toBeInstanceOf(CustomEnvironment);
    });

    it('should initialize the collector with the correct options', () => {
      const expectedOptions = {
        enabled: true,
        outputEvidence: {
          folder: './evidence',
          file: 'results.json',
        },
      };
      expect(Collector.getInstance).toHaveBeenCalledWith(expectedOptions);
    });

    it('should set the collectEvidence function in the global object', () => {
      expect(customEnvironment.global.collectEvidence).toBeDefined();
    });
  });

  describe('collectEvidence', () => {
    it('should add evidence to the collector for the current test case', () => {
      const mockAddEvidence = jest.spyOn(mockCollector, 'addEvidence');
      jest.spyOn(mockCollector, 'getTestCase').mockReturnValue({identifier: 'ABC-TestCase1'} as TestCase)
      customEnvironment.testId = 'ABC-TestCase1';

      customEnvironment.collectEvidence('Evidence description', { foo: 'bar' }, customEnvironment.testId);

      expect(mockAddEvidence).toHaveBeenCalledWith(
        expect.objectContaining({ identifier: 'ABC-TestCase1' }),
        expect.objectContaining({
          description: 'Evidence description',
          data: { foo: 'bar' },
          identifier: 'ABC-TestCase1',
        })
      );
    });

    it('should not add evidence if the current test case does not exist', () => {
      const mockAddEvidence = jest.spyOn(mockCollector, 'addEvidence');
      customEnvironment.testId = '';

      customEnvironment.collectEvidence('Evidence description', { foo: 'bar' }, 'identifier');

      expect(mockAddEvidence).not.toHaveBeenCalled();
    });
  });

  describe('startTest', () => {
    it('should add a new test case to the collector', () => {
      const mockAddTestCase = jest.spyOn(mockCollector, 'addTestCase');
      jest.spyOn(mockCollector, 'extractTestCase').mockReturnValue('myProject.TestCase1')
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
      const mockCollectEvidence = jest.spyOn(customEnvironment, 'collectEvidence');
      const state = {
        currentlyRunningTest: {
          errors: ['Error 1', 'Error 2'],
        },
      } as unknown as Circus.State;

      customEnvironment.endTest(state, false);

      expect(mockCollectEvidence).toHaveBeenCalledWith(
        'Error executing test',
        ['Error 1', 'Error 2'],
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
