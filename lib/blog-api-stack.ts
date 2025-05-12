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

    const googleProvider = new cognito.UserPoolIdentityProviderGoogle(this, 'Google', {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      userPool,
    });

    new cognito.UserPoolDomain(this, 'UserPoolDomain', {
      userPool,
      cognitoDomain: {
        domainPrefix: process.env.COGNITO_DOMAIN_PREFIX!, 
    },
    });

    const client = userPool.addClient('AppClient', {
      oAuth: {
        flows: { authorizationCodeGrant: true },
        callbackUrls: [process.env.COGNITO_CALLBACK_URL!],
        logoutUrls: [process.env.COGNITO_LOGOUT_URL!],
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
        cognito.UserPoolClientIdentityProvider.GOOGLE,
      ],
    });

    const blogLambda = new lambda.Function(this, 'BlogLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'blog.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        TABLE_NAME: blogTable.tableName,
      },
    });

    const userLambda = new lambda.Function(this, 'UserLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'user.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        USER_POOL_ID: userPool.userPoolId,
      },
    });

    blogTable.grantReadWriteData(blogLambda);

    const api = new apigateway.RestApi(this, 'BlogApi', {
      restApiName: 'Blog API',
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
