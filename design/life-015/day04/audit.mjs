// Runs the shared author-local audit against DAY04; no public registry mutation.
process.argv[2] = '4';
await import('../day02/audit.mjs');
