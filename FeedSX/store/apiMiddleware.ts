import {Alert} from 'react-native';
import {Middleware} from '@reduxjs/toolkit';
import {START_LOADING, STOP_LOADING} from './types/loader';

export const NETWORK_FAILED = 'Network request failed';

async function invokeAPI(func: Function) {
  if (func === undefined) {
    return;
  }
  const response: any = await func;
  return response?.data;
}

export const CALL_API = 'Call API';

const apiMiddleware: Middleware = () => next => async action => {
  // So the middleware doesn't get applied to every single action
  if (typeof action[CALL_API] === 'undefined') {
    return next(action);
  }

  const {func, types = [], showLoader = false} = action[CALL_API];

  const [requestType, successType] = types;

  //   const { authReducer: auth } = store.getState();
  requestType && next({type: requestType});
  try {
    if (showLoader) {
      next({type: START_LOADING});
    }

    const responseBody = await invokeAPI(func);

    successType &&
      next({
        body: {...responseBody},
        type: successType,
      });

    return responseBody;
  } catch (error: any) {
    if (Number(error.message) === 401) {
      //   next({ type: USER_LOGOUT_SUCCESS });
    } else {
      if (error.message === NETWORK_FAILED) {
        Alert.alert('', 'Please check your internet connection');
      } else {
        throw error.message;
      }
    }
  } finally {
    if (showLoader) {
      next({type: STOP_LOADING});
    }
  }
};

export default apiMiddleware;
