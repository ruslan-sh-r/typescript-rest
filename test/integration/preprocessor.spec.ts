'use strict';

import * as chai from 'chai';
import * as express from 'express';
import * as _ from 'lodash';
import 'mocha';
import * as request from 'request';
import { ContextRequest, Errors, Path, POST, Preprocessor, Server } from '../../src/typescript-rest';

const expect = chai.expect;

@Path('preprocessor')
@Preprocessor(preprocessor1)
export class PreprocessedService {
    @ContextRequest
    public request: PreprocessedRequest;

    @Path('test')
    @POST
    @Preprocessor(preprocessor2)
    public test(body: any) {
        return this.request.preprocessor1 && this.request.preprocessor2;
    }

    @Path('asynctest')
    @POST
    @Preprocessor(asyncPreprocessor1)
    @Preprocessor(asyncPreprocessor2) // multiple preprocessors needed to test async
    public asynctest(body: any) {
        return this.request.preprocessor1 && (!this.request.preprocessor2) &&
            this.request.asyncPreproocessor1 && this.request.asyncPreproocessor2;
    }
}

function preprocessor1(req: PreprocessedRequest) {
    if (!req.body.valid) {
        throw new Errors.BadRequestError();
    }
    req.preprocessor1 = true;
}

function preprocessor2(req: PreprocessedRequest) {
    req.preprocessor2 = true;
}

async function asyncPreprocessor1(req: PreprocessedRequest) {
    if (!req.body.asyncValid) {
        throw new Errors.BadRequestError();
    }
    req.asyncPreproocessor1 = true;
}

async function asyncPreprocessor2(req: PreprocessedRequest) {
    req.asyncPreproocessor2 = true;
}

interface PreprocessedRequest extends express.Request {
    preprocessor1: boolean;
    preprocessor2: boolean;
    asyncPreproocessor1: boolean;
    asyncPreproocessor2: boolean;
}

describe('Preprocessor Tests', () => {

    before(() => {
        return startApi();
    });

    after(() => {
        stopApi();
    });

    describe('Synchronous Preprocessors', () => {
        it('should validate before handling the request', (done) => {
            request.post({
                body: JSON.stringify({ valid: true }),
                headers: { 'content-type': 'application/json' },
                url: 'http://localhost:5674/preprocessor/test'
            }, (error, response, body) => {
                expect(body).to.eq('true');
                done();
            });
        });
        it('should fail validation when body is invalid', (done) => {
            request.post({
                body: JSON.stringify({}),
                headers: { 'content-type': 'application/json' },
                url: 'http://localhost:5674/preprocessor/test'
            }, (error, response, body) => {
                expect(response.statusCode).to.eq(400);
                done();
            });
        });
    });

    describe('Assynchronous Preprocessors', () => {
        it('should validate before handling the request', (done) => {
            request.post({
                body: JSON.stringify({ valid: true, asyncValid: true }),
                headers: { 'content-type': 'application/json' },
                url: 'http://localhost:5674/preprocessor/asynctest'
            }, (error, response, body) => {
                expect(body).to.eq('true');
                done();
            });
        });
        it('should fail validation when body is invalid', (done) => {
            request.post({
                body: JSON.stringify({ valid: true }),
                headers: { 'content-type': 'application/json' },
                url: 'http://localhost:5674/preprocessor/asynctest'
            }, (error, response, body) => {
                expect(response.statusCode).to.eq(400);
                done();
            });
        });
    });
});

let server: any;

function startApi(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const app: express.Application = express();
        app.set('env', 'test');
        Server.buildServices(app, PreprocessedService);
        server = app.listen(5674, (err: any) => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
}

function stopApi() {
    if (server) {
        server.close();
    }
}