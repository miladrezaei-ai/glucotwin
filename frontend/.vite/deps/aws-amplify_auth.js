import {
  Amplify,
  AuthAction,
  AuthError,
  DEFAULT_SERVICE_CLIENT_API_CONFIG,
  PasskeyError,
  PasskeyErrorCode,
  assertAuthTokens,
  assertCredentialIsPkcWithAuthenticatorAttestationResponse,
  assertPasskeyError,
  assertTokenProviderConfig,
  assertValidCredentialCreationOptions,
  autoSignIn,
  cognitoUserPoolTransferHandler,
  composeServiceApi,
  confirmResetPassword,
  confirmSignIn,
  confirmSignUp,
  confirmUserAttribute,
  createCognitoUserPoolEndpointResolver,
  createUserPoolDeserializer,
  createUserPoolSerializer,
  decodeJWT,
  deleteUser,
  deleteUserAttributes,
  deserializeJsonToPkcCreationOptions,
  fetchAuthSession,
  fetchDevices,
  fetchMFAPreference,
  fetchUserAttributes,
  forgetDevice,
  getAuthUserAgentValue,
  getCurrentUser,
  getIsPasskeySupported,
  getRegionFromUserPoolId,
  handlePasskeyError,
  passkeyErrorMap,
  rememberDevice,
  resendSignUpCode,
  resetPassword,
  sendUserAttributeVerificationCode,
  serializePkcWithAttestationToJson,
  setUpTOTP,
  signIn,
  signInWithRedirect,
  signOut,
  signUp,
  updateMFAPreference,
  updatePassword,
  updateUserAttribute,
  updateUserAttributes,
  verifyTOTPSetup
} from "./chunk-HM3JX5DW.js";
import "./chunk-DC5AMYBS.js";

// node_modules/aws-amplify/node_modules/@aws-amplify/auth/dist/esm/client/utils/passkey/errors/handlePasskeyRegistrationError.mjs
var handlePasskeyRegistrationError = (err) => {
  if (err instanceof PasskeyError) {
    return err;
  }
  if (err instanceof Error) {
    if (err.name === "InvalidStateError") {
      const { message, recoverySuggestion } = passkeyErrorMap[PasskeyErrorCode.PasskeyAlreadyExists];
      return new PasskeyError({
        name: PasskeyErrorCode.PasskeyAlreadyExists,
        message,
        recoverySuggestion,
        underlyingError: err
      });
    }
    if (err.name === "NotAllowedError") {
      const { message, recoverySuggestion } = passkeyErrorMap[PasskeyErrorCode.PasskeyRegistrationCanceled];
      return new PasskeyError({
        name: PasskeyErrorCode.PasskeyRegistrationCanceled,
        message,
        recoverySuggestion,
        underlyingError: err
      });
    }
  }
  return handlePasskeyError(err);
};

// node_modules/aws-amplify/node_modules/@aws-amplify/auth/dist/esm/client/utils/passkey/registerPasskey.mjs
var registerPasskey = async (input) => {
  try {
    const isPasskeySupported = getIsPasskeySupported();
    assertPasskeyError(isPasskeySupported, PasskeyErrorCode.PasskeyNotSupported);
    const passkeyCreationOptions = deserializeJsonToPkcCreationOptions(input);
    const credential = await navigator.credentials.create({
      publicKey: passkeyCreationOptions
    });
    assertCredentialIsPkcWithAuthenticatorAttestationResponse(credential);
    return serializePkcWithAttestationToJson(credential);
  } catch (err) {
    throw handlePasskeyRegistrationError(err);
  }
};

// node_modules/aws-amplify/node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/createStartWebAuthnRegistrationClient.mjs
var createStartWebAuthnRegistrationClient = (config) => composeServiceApi(cognitoUserPoolTransferHandler, createUserPoolSerializer("StartWebAuthnRegistration"), createUserPoolDeserializer(), {
  ...DEFAULT_SERVICE_CLIENT_API_CONFIG,
  ...config
});

// node_modules/aws-amplify/node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/createCompleteWebAuthnRegistrationClient.mjs
var createCompleteWebAuthnRegistrationClient = (config) => composeServiceApi(cognitoUserPoolTransferHandler, createUserPoolSerializer("CompleteWebAuthnRegistration"), createUserPoolDeserializer(), {
  ...DEFAULT_SERVICE_CLIENT_API_CONFIG,
  ...config
});

// node_modules/aws-amplify/node_modules/@aws-amplify/auth/dist/esm/client/apis/associateWebAuthnCredential.mjs
async function associateWebAuthnCredential() {
  var _a;
  const authConfig = (_a = Amplify.getConfig().Auth) == null ? void 0 : _a.Cognito;
  assertTokenProviderConfig(authConfig);
  const { userPoolEndpoint, userPoolId } = authConfig;
  const { tokens } = await fetchAuthSession();
  assertAuthTokens(tokens);
  const startWebAuthnRegistration = createStartWebAuthnRegistrationClient({
    endpointResolver: createCognitoUserPoolEndpointResolver({
      endpointOverride: userPoolEndpoint
    })
  });
  const { CredentialCreationOptions: credentialCreationOptions } = await startWebAuthnRegistration({
    region: getRegionFromUserPoolId(userPoolId),
    userAgentValue: getAuthUserAgentValue(AuthAction.StartWebAuthnRegistration)
  }, {
    AccessToken: tokens.accessToken.toString()
  });
  assertValidCredentialCreationOptions(credentialCreationOptions);
  const cred = await registerPasskey(credentialCreationOptions);
  const completeWebAuthnRegistration = createCompleteWebAuthnRegistrationClient({
    endpointResolver: createCognitoUserPoolEndpointResolver({
      endpointOverride: userPoolEndpoint
    })
  });
  await completeWebAuthnRegistration({
    region: getRegionFromUserPoolId(userPoolId),
    userAgentValue: getAuthUserAgentValue(AuthAction.CompleteWebAuthnRegistration)
  }, {
    AccessToken: tokens.accessToken.toString(),
    Credential: cred
  });
}

// node_modules/aws-amplify/node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/createListWebAuthnCredentialsClient.mjs
var createListWebAuthnCredentialsClient = (config) => composeServiceApi(cognitoUserPoolTransferHandler, createUserPoolSerializer("ListWebAuthnCredentials"), createUserPoolDeserializer(), {
  ...DEFAULT_SERVICE_CLIENT_API_CONFIG,
  ...config
});

// node_modules/aws-amplify/node_modules/@aws-amplify/auth/dist/esm/foundation/apis/listWebAuthnCredentials.mjs
async function listWebAuthnCredentials(amplify, input) {
  var _a;
  const authConfig = (_a = amplify.getConfig().Auth) == null ? void 0 : _a.Cognito;
  assertTokenProviderConfig(authConfig);
  const { userPoolEndpoint, userPoolId } = authConfig;
  const { tokens } = await amplify.Auth.fetchAuthSession();
  assertAuthTokens(tokens);
  const listWebAuthnCredentialsResult = createListWebAuthnCredentialsClient({
    endpointResolver: createCognitoUserPoolEndpointResolver({
      endpointOverride: userPoolEndpoint
    })
  });
  const { Credentials: commandCredentials = [], NextToken: nextToken } = await listWebAuthnCredentialsResult({
    region: getRegionFromUserPoolId(userPoolId),
    userAgentValue: getAuthUserAgentValue(AuthAction.ListWebAuthnCredentials)
  }, {
    AccessToken: tokens.accessToken.toString(),
    MaxResults: input == null ? void 0 : input.pageSize,
    NextToken: input == null ? void 0 : input.nextToken
  });
  const credentials = commandCredentials.map((item) => ({
    credentialId: item.CredentialId,
    friendlyCredentialName: item.FriendlyCredentialName,
    relyingPartyId: item.RelyingPartyId,
    authenticatorAttachment: item.AuthenticatorAttachment,
    authenticatorTransports: item.AuthenticatorTransports,
    createdAt: item.CreatedAt ? new Date(item.CreatedAt * 1e3) : void 0
  }));
  return {
    credentials,
    nextToken
  };
}

// node_modules/aws-amplify/node_modules/@aws-amplify/auth/dist/esm/client/apis/listWebAuthnCredentials.mjs
async function listWebAuthnCredentials2(input) {
  return listWebAuthnCredentials(Amplify, input);
}

// node_modules/aws-amplify/node_modules/@aws-amplify/auth/dist/esm/foundation/factories/serviceClients/cognitoIdentityProvider/createDeleteWebAuthnCredentialClient.mjs
var createDeleteWebAuthnCredentialClient = (config) => composeServiceApi(cognitoUserPoolTransferHandler, createUserPoolSerializer("DeleteWebAuthnCredential"), createUserPoolDeserializer(), {
  ...DEFAULT_SERVICE_CLIENT_API_CONFIG,
  ...config
});

// node_modules/aws-amplify/node_modules/@aws-amplify/auth/dist/esm/foundation/apis/deleteWebAuthnCredential.mjs
async function deleteWebAuthnCredential(amplify, input) {
  var _a;
  const authConfig = (_a = amplify.getConfig().Auth) == null ? void 0 : _a.Cognito;
  assertTokenProviderConfig(authConfig);
  const { userPoolEndpoint, userPoolId } = authConfig;
  const { tokens } = await amplify.Auth.fetchAuthSession();
  assertAuthTokens(tokens);
  const deleteWebAuthnCredentialResult = createDeleteWebAuthnCredentialClient({
    endpointResolver: createCognitoUserPoolEndpointResolver({
      endpointOverride: userPoolEndpoint
    })
  });
  await deleteWebAuthnCredentialResult({
    region: getRegionFromUserPoolId(userPoolId),
    userAgentValue: getAuthUserAgentValue(AuthAction.DeleteWebAuthnCredential)
  }, {
    AccessToken: tokens.accessToken.toString(),
    CredentialId: input.credentialId
  });
}

// node_modules/aws-amplify/node_modules/@aws-amplify/auth/dist/esm/client/apis/deleteWebAuthnCredential.mjs
async function deleteWebAuthnCredential2(input) {
  return deleteWebAuthnCredential(Amplify, input);
}
export {
  AuthError,
  associateWebAuthnCredential,
  autoSignIn,
  confirmResetPassword,
  confirmSignIn,
  confirmSignUp,
  confirmUserAttribute,
  decodeJWT,
  deleteUser,
  deleteUserAttributes,
  deleteWebAuthnCredential2 as deleteWebAuthnCredential,
  fetchAuthSession,
  fetchDevices,
  fetchMFAPreference,
  fetchUserAttributes,
  forgetDevice,
  getCurrentUser,
  listWebAuthnCredentials2 as listWebAuthnCredentials,
  rememberDevice,
  resendSignUpCode,
  resetPassword,
  sendUserAttributeVerificationCode,
  setUpTOTP,
  signIn,
  signInWithRedirect,
  signOut,
  signUp,
  updateMFAPreference,
  updatePassword,
  updateUserAttribute,
  updateUserAttributes,
  verifyTOTPSetup
};
//# sourceMappingURL=aws-amplify_auth.js.map
