import api from "../../src";
import serverless from "serverless-http"

export const handler = serverless(api);