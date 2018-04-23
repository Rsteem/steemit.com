// newrelic is not working with latest npm
//if(config.has('newrelic')) require('newrelic');

import path from 'path';
import fs from 'fs';
import Koa from 'koa';
import mount from 'koa-mount';
import helmet from 'koa-helmet';
import koa_logger from 'koa-logger';
import prod_logger from './prod_logger';
import favicon from 'koa-favicon';
import staticCache from 'koa-static-cache';
import useRedirects from './redirects';
import useGeneralApi from './api/general';
import useTestnetApi from './testnet_api';
import useAccountRecoveryApi from './api/account_recovery';
import useNotificationsApi from './api/notifications';
import useRegistrationApi from './api/registration';
import {proxyRoutes as useProxyRoutes} from './api/proxy';
import {ratesRoutes as useRatesRoutes} from './api/rates';
import useUserJson from './json/user_json';
import usePostJson from './json/post_json';
import isBot from 'koa-isbot';
import session from './utils/cryptoSession';
import csrf from 'koa-csrf';
import flash from 'koa-flash';
import minimist from 'minimist';
import config from 'config';
import { routeRegex } from 'app/ResolveRoute';
import { blockedUsers } from 'app/utils/IllegalContent';
import secureRandom from 'secure-random';
import { APP_NAME_LATIN } from 'app/client_config';

console.log('application server starting, please wait.');

const app = new Koa();
app.name = APP_NAME_LATIN + ' app';
const env = process.env.NODE_ENV || 'development';
// cache of a thousand days
const cacheOpts = { maxAge: 86400000, gzip: true };

app.keys = [config.get('session_key')];

const crypto_key = config.get('server_session_secret');

session(app, {
    maxAge: 1000 * 3600 * 24 * 60,
    crypto_key,
    key: config.get('session_cookie_key')
});
csrf(app);
// app.use(csrf.middleware);
app.use(flash({ key: 'flash' }));

function convertEntriesToArrays(obj) {
    return Object.keys(obj).reduce((result, key) => {
        result[key] = obj[key].split(/\s+/);
        return result;
    }, {});
}

// some redirects
app.use(function*(next) {
    // normalize url
    // if (this.url.indexOf('%') !== -1) {
    //     const transfer = this.url.split("?")[0].split(`/`).includes(`transfers`);
    //   if (!transfer) {
    //     //  fixme potential 500
    //     this.redirect(decodeURIComponent(this.url));
    //     return;
    //   }
    // }
    // redirect to home page/feed if known account
    if (this.method === 'GET' && this.url === '/' && this.session.a) {
        this.status = 302;
        this.redirect(`/@${this.session.a}/feed`);
        return;
    }
    // normalize user name url from cased params
    if (
        this.method === 'GET' &&
            (routeRegex.UserProfile1.test(this.url) ||
                routeRegex.PostNoCategory.test(this.url))
    ) {
        const p = this.originalUrl.toLowerCase();
		let userCheck = "";
		if (routeRegex.Post.test(this.url)) {
			userCheck = p.split("/")[2].slice(1);
		} else {
			userCheck = p.split("/")[1].slice(1);
		}
		if (blockedUsers.includes(userCheck)) {
			console.log('Illegal content user found blocked', `@${userCheck}`);
			this.status = 451;
			return;
		}
        if (p !== this.originalUrl) {
            this.status = 301;
            this.redirect(p);
            return;
        }
    }
    // normalize top category filtering from cased params
    if (this.method === 'GET' && routeRegex.CategoryFilters.test(this.url)) {
        const p = this.originalUrl.toLowerCase();
        if (p !== this.originalUrl) {
            this.status = 301;
            this.redirect(p);
            return;
        }
    }
    // start registration process if user get to create_account page and has no id in session yet
    // if (this.url === '/create_account' && !this.session.user) {
    //     this.status = 302;
    //     this.redirect('/enter_email');
    //     return;
    // }
    // remember ch, cn, r url params in the session and remove them from url
    if (this.method === 'GET' && /\?[^\w]*(ch=|cn=|r=)/.test(this.url)) {
        let redir = this.url.replace(/((ch|cn|r)=[^&]+)/gi, r => {
            const p = r.split('=');
            if (p.length === 2) this.session[p[0]] = p[1];
            return '';
        });
        redir = redir.replace(/&&&?/, '');
        redir = redir.replace(/\?&?$/, '');
        console.log(`server redirect ${this.url} -> ${redir}`);
        this.status = 302;
        this.redirect(redir);
    } else {
        yield next;
    }
});

// load production middleware
if (env === 'production') {
    app.use(require('koa-conditional-get')());
    app.use(require('koa-etag')());
    app.use(require('koa-compressor')());
}

// Logging
if (env === 'production') {
    app.use(prod_logger());
} else {
     app.use(koa_logger());
}

app.use(helmet());

app.use(mount('/static', staticCache(path.join(__dirname, '../app/assets/static'), cacheOpts)));

app.use(
    mount('/robots.txt', function*() {
        this.set('Cache-Control', 'public, max-age=86400000');
        this.type = 'text/plain';
        this.body = 'User-agent: *\nAllow: /';
    })
);

app.use(
    mount('/service-worker.js', function*() {
        this.set('Cache-Control', 'public, max-age=7200000');
        this.type = 'application/javascript';
        const file_content = fs
            .readFileSync(path.join(__dirname, './service-worker.js'))
            .toString();
        // TODO: use APP_DOMAIN from client_config.js
        // actually use a config value for it
        this.body = file_content.replace(
            /\{DEFAULT_URL\}/i,
            'https://' + this.request.header.host
        );
    })
);

// set user's uid - used to identify users in logs and some other places
// FIXME SECURITY PRIVACY cycle this uid after a period of time
app.use(function*(next) {
    if (! /(\.js(on)?|\.css|\.map|\.ico|\.png|\.jpe?g)$/.test(this.url)) {
        const last_visit = this.session.last_visit;
        this.session.last_visit = new Date().getTime() / 1000 | 0;
        if (!this.session.uid) {
            this.session.uid = secureRandom.randomBuffer(13).toString('hex');
            this.session.new_visit = true;
        } else {
            this.session.new_visit = this.session.last_visit - last_visit > 1800;
        }
    }
    yield next;
});

useRedirects(app);
useRegistrationApi(app);
useUserJson(app);
usePostJson(app);

useAccountRecoveryApi(app);
useGeneralApi(app);
useNotificationsApi(app);
useProxyRoutes(app);
useRatesRoutes(app);

// if (config.get('is_testnet')) {
//     useTestnetApi(app);
// }

// helmet wants some things as bools and some as lists, makes config difficult.
// our config uses strings, this splits them to lists on whitespace.

if (env === 'production') {
    const helmetConfig = {
        directives: convertEntriesToArrays(config.get('helmet.directives')),
        reportOnly: config.get('helmet.reportOnly'),
        setAllHeaders: config.get('helmet.setAllHeaders')
    };
    helmetConfig.directives.reportUri = '/api/v1/csp_violation';
    app.use(helmet.contentSecurityPolicy(helmetConfig));
}

app.use(favicon(path.join(__dirname, '../app/assets/images/favicons/favicon.ico')));
app.use(mount('/favicons', staticCache(path.join(__dirname, '../app/assets/images/favicons'), cacheOpts)));
app.use(mount('/images', staticCache(path.join(__dirname, '../app/assets/images'), cacheOpts)));
app.use(mount('/legal', staticCache(path.join(__dirname, '../app/assets/legal'), cacheOpts)));
app.use(mount('/sitemap.xml', staticCache(path.join(__dirname, '../app/assets/sitemap.xml'), cacheOpts)));
app.use(mount('/robots.txt', staticCache(path.join(__dirname, '../app/assets/robots.txt'), cacheOpts)));
app.use(isBot());


// Proxy asset folder to webpack development server in development mode
if (env === 'development') {
    const webpack_dev_port = process.env.PORT
        ? parseInt(process.env.PORT) + 1
        : 8081;
    const proxyhost = `http://${(process.platform === 'win32') ? '127.0.0.1' : '0.0.0.0'}:${webpack_dev_port}`;
    console.log('proxying to webpack dev server at ' + proxyhost);
    const proxy = require('koa-proxy')({
        host: proxyhost,
        map: filePath => 'assets/' + filePath
    });
    app.use(mount('/assets', proxy));
} else {
    app.use(mount('/assets', staticCache(path.join(__dirname, '../dist'), cacheOpts)));
}

if (env !== 'test') {
    const appRender = require('./app_render');
    app.use(function*() {
        yield appRender(this);
        // if (app_router.dbStatus.ok) recordWebEvent(this, 'page_load');
        const bot = this.state.isBot;
        if (bot) {
            console.log(`[reqid ${this.request.header['x-request-id']}] ${this.method} ${this.originalUrl} ${this.status} (BOT '${bot}')`);
        }
    });

    const argv = minimist(process.argv.slice(2));

    const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;

    app.listen(port);

    // Tell parent process koa-server is started
    if (process.send) process.send('online');
    console.log(`Application started on port ${port}`);
}

module.exports = app;
