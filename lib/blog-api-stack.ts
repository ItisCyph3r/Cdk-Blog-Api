import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';

export class BlogApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const blogTable = new dynamodb.Table(this, 'BlogTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    const userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
    });

    new cognito.UserPoolDomain(this, 'UserPoolDomain', {
      userPool,
      cognitoDomain: {
        domainPrefix: 'my-blog-auth', 
    },
    });

    const client = userPool.addClient('AppClient', {
      oAuth: {
        flows: { authorizationCodeGrant: true },
        callbackUrls: ['http://localhost:3000/callback'],
        logoutUrls: ['http://localhost:3000/logout'],
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
    });    const blogLambda = new lambda.Function(this, 'BlogLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'blog.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        TABLE_NAME: blogTable.tableName,
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    const userLambda = new lambda.Function(this, 'UserLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'user.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        USER_POOL_ID: userPool.userPoolId,
      },
    });

    blogTable.grantReadWriteData(blogLambda);    const api = new apigateway.RestApi(this, 'BlogApi', {
      restApiName: 'Blog API',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
        allowCredentials: true
      },
      deployOptions: {
        tracingEnabled: true,
        dataTraceEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
      }
    });

    const posts = api.root.addResource('posts');
    posts.addMethod('POST', new apigateway.LambdaIntegration(blogLambda));
    posts.addMethod('GET', new apigateway.LambdaIntegration(blogLambda));
    posts.addMethod('PUT', new apigateway.LambdaIntegration(blogLambda));
    posts.addMethod('DELETE', new apigateway.LambdaIntegration(blogLambda));

    const user = api.root.addResource('user');
    user.addMethod('PUT', new apigateway.LambdaIntegration(userLambda));

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url ?? 'Something went wrong with the deploy',
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: client.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });
  }
}
