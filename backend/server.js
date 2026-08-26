const app = require('./src/app');
const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`=============================================`);
  console.log(` GLOBEX API SERVER RUNNING ON PORT: ${port}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(` URL: http://localhost:${port}`);
  console.log(`=============================================`);
});
