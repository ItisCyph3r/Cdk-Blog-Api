#!/usr/bin/env node
import * as dotenv from 'dotenv';
dotenv.config();

import * as cdk from 'aws-cdk-lib';
import { BlogApiStack } from '../lib/blog-api-stack';  // <-- updated

const app = new cdk.App();
new BlogApiStack(app, 'BlogApiStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'eu-west-2'
  }
});