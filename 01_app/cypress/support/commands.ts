/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom command to login with mock authentication
Cypress.Commands.add('login', (username: string = 'testuser@example.com', password: string = 'password') => {
  // Mock authentication for testing
  cy.window().then((win) => {
    win.localStorage.setItem('isAuthenticated', 'true');
    win.localStorage.setItem('userEmail', username);
  });
  cy.visit('/');
});

// Custom command to wait for weather data to load
Cypress.Commands.add('waitForWeatherData', () => {
  cy.intercept('POST', '**/graphql', (req) => {
    if (req.body.query?.includes('GetCurrentSensorData')) {
      req.alias = 'getCurrentData';
    }
    if (req.body.query?.includes('GetHistoricalData')) {
      req.alias = 'getHistoricalData';
    }
    if (req.body.query?.includes('GetStatistics')) {
      req.alias = 'getStatistics';
    }
  });
});

// Custom command to mock weather data
Cypress.Commands.add('mockWeatherData', () => {
  const mockCurrentData = {
    data: {
      listByDeviceAndTime: {
        items: [{
          deviceId: 'M-X-001',
          timestamp: new Date().toISOString(),
          temperature: 25.5,
          humidity: 60.0,
          pressure: 1013.25,
          windSpeed: 5.2,
          windDirection: 180,
          rainfall: 0.0,
          illuminance: 50000,
          visibility: 10.0,
          feelsLike: 26.0
        }]
      }
    }
  };

  const mockHistoricalData = {
    data: {
      listByDeviceAndTime: {
        items: Array.from({ length: 10 }, (_, i) => ({
          deviceId: 'M-X-001',
          timestamp: new Date(Date.now() - i * 10 * 60 * 1000).toISOString(),
          temperature: 24 + Math.random() * 2,
          humidity: 58 + Math.random() * 4,
          pressure: 1012 + Math.random() * 2,
          windSpeed: 4 + Math.random() * 2,
          windDirection: 170 + Math.random() * 20,
          rainfall: 0,
          illuminance: 45000 + Math.random() * 10000,
          visibility: 10,
          feelsLike: 25 + Math.random() * 2
        }))
      }
    }
  };

  const mockStatsData = {
    data: {
      listByDeviceAndTime: {
        items: [{
          deviceId: 'M-X-001',
          period: 'HOUR',
          startTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          endTime: new Date().toISOString(),
          temperatureMax: 26.0,
          temperatureMin: 24.0,
          temperatureAvg: 25.0,
          humidityMax: 65.0,
          humidityMin: 55.0,
          humidityAvg: 60.0,
          windSpeedMax: 8.5,
          windSpeedMin: 3.2,
          windSpeedAvg: 5.8,
          samples: 60
        }]
      }
    }
  };

  cy.intercept('POST', '**/graphql', (req) => {
    if (req.body.query?.includes('GetCurrentSensorData')) {
      req.reply(mockCurrentData);
    } else if (req.body.query?.includes('GetHistoricalData')) {
      req.reply(mockHistoricalData);
    } else if (req.body.query?.includes('GetStatistics')) {
      req.reply(mockStatsData);
    }
  });
});

// Custom command to check responsive design
Cypress.Commands.add('checkResponsive', () => {
  // Mobile
  cy.viewport(375, 667);
  cy.wait(500);
  
  // Tablet
  cy.viewport(768, 1024);
  cy.wait(500);
  
  // Desktop
  cy.viewport(1280, 720);
  cy.wait(500);
});

// Declare types for custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      login(username?: string, password?: string): Chainable<void>;
      waitForWeatherData(): Chainable<void>;
      mockWeatherData(): Chainable<void>;
      checkResponsive(): Chainable<void>;
    }
  }
}

export {};