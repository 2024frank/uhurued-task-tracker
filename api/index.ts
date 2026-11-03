import { createTrackerApp } from '../server/app.js';

const app = createTrackerApp();

export default {
  fetch: (request: Request) => app.fetch(request),
};

export const maxDuration = 60;
