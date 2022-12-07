import CryptoJS from "crypto-js";
import * as crypto from "crypto";
import fetch from "node-fetch";
import { TextEncoder } from "util";


// URL
// const apiUrl = `https://www.soliscloud.com:15555`;
const apiUrl = `https://www.soliscloud.com:13333`;

export async function callApi<T>(url: string, bodyValue: any, keyId: string, KeySecret: string): Promise<T | null> {
  // Body
  const body = JSON.stringify(bodyValue);

  // MD5 of string
  const md5Base64 = CryptoJS.enc.Base64.stringify(CryptoJS.MD5(body));

  // Content-Type
  const contentType = "application/json";

  // Date
  const date = new Date();
  const gmtDate = date.toUTCString();

  // Resource to call
  const resource = url;

  // Get authorization header
  const authorizationText = `POST
${md5Base64}
${contentType}
${gmtDate}
${resource}`
  
  const authorizationHash = crypto.createHmac("sha1", KeySecret).update(new TextEncoder().encode(authorizationText)).digest("base64");
  const authorizationValue = `API ${keyId}:${authorizationHash}`;

  const absUrl = `${apiUrl}${resource}`;

  const response = await fetch(absUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'content-md5': md5Base64,
      'authorization': authorizationValue,
      'date': gmtDate,
    },
    body
  });

  if (response.ok) {
    const data = await response.json();
    return data;
  } else {
    console.log(`Error`, response.statusText);
    return null;
  }
}
