// Include the cluster module
let cluster = require('cluster'),
    express = require('express'),
    bodyParser = require('body-parser'),
    dotenv = require('dotenv'),
    path = require('path');

const error = dotenv.config().error;

if (error) throw error;

// Code to run if we're in the master process
if (cluster.isMaster) {

    let maxWorkers = parseInt(process.env.MAX_WORKERS || '4'),

        // Check workers to restart
        checkWorkers = function () {
            Object.values(cluster.workers).forEach((worker) => {
                if (worker.toRestart && worker.state === 'listening') worker.disconnect();
            })
        },

        // Create worker
        createWorker = function () {
            let worker = cluster.fork();
            worker.on('message', console.log);
            worker.on('online', function () {
                console.info('Worker #' + worker.id + ' is online.');
                checkWorkers();
            });
            return worker;
        };

    // Create a worker for each CPU
    for (let i = 0; i < maxWorkers; i++) createWorker();

    // Listen for dying workers
    cluster.on('exit', function (worker) {
        // Replace the dead worker, we're not sentimental
        if (worker.suicide) {
            console.warn('Worker ' + worker.id + ' restarted.');
        } else {
            console.error('Worker ' + worker.id + ' died.');
        }
        createWorker();
    });

    // Disconnect
    cluster.on('disconnect', function (worker) {
        console.warn('Disconnect, restarting worker #' + worker.id);
        worker.kill();
    });

} else {
    // Code to run if we're in a worker process
    let app = express(),
        worker = cluster.worker;

    app.set('port', (process.env.PORT || 80));

    app.use(express.static(path.join(__dirname, '/public')));
    app.use('/public', express.static(path.join(__dirname, 'public')));

    app.use(bodyParser.json()); // support json encoded bodies
    app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

    // views is directory for all template files
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'ejs');

    app.get('/', function (request, response) {
        console.log('Worker #%d process GET request to index.', worker.id);
        require('./controllers')(request, response);
    });

    app.post('/action', function (request, response) {
        console.log('Worker #%d process POST request to action.', worker.id);
        require('./controllers/action')(request, response, request.body);
    });

    app.post('/parser', function (request, response) {
        console.log('Worker #%d process POST request to parser.', worker.id);
        require('./controllers/parser')(request, response, request.body);
    });

    app.listen(app.get('port'), function () {
        console.log('Worker #%d is running on port %d.', worker.id, app.get('port'));
    });

    app.use(function (err, req, res, next) {
        let msg = err.message,
            code = 500,
            m;

        if (m = msg.match(/^(\[(\d+)\]-)/)) {
            msg = msg.replace(m[1], '');
            code = m[2];
        }

        res.status(code).json({ error: true, message: msg })
    });
}