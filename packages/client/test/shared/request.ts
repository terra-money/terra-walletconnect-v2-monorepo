import "mocha";
import { expect } from "chai";
import Timestamp from "@pedrouid/timestamp";
import { SessionTypes } from "@walletconnect/types";
import {
  formatJsonRpcRequest,
  formatJsonRpcResult,
  isJsonRpcRequest,
  JsonRpcRequest,
  JsonRpcResponse,
} from "@json-rpc-tools/utils";

import Client, { CLIENT_EVENTS } from "../../src";
import { TEST_ETHEREUM_ACCOUNTS, TEST_PERMISSIONS_CHAIN_IDS } from "./values";

interface RequestScenarioOptions {
  topic: string;
  clients: Record<string, Client>;
  chainId?: string;
  request?: JsonRpcRequest;
  response?: JsonRpcResponse;
}

export async function testRequestScenarios(opts: RequestScenarioOptions): Promise<any> {
  const { topic } = opts;
  const chainId = opts?.chainId || TEST_PERMISSIONS_CHAIN_IDS[0];
  const request = opts?.request || formatJsonRpcRequest("eth_accounts", []);
  const response = opts?.response || formatJsonRpcResult(request.id, TEST_ETHEREUM_ACCOUNTS);

  const clientA = opts.clients["a"];
  const clientB = opts.clients["b"];

  // cache result
  let result: any;

  // timestamps & elapsed time
  const time = new Timestamp();

  // request & resolve a JSON-RPC request
  await Promise.all([
    new Promise<void>(async (resolve, reject) => {
      clientB.on(CLIENT_EVENTS.session.payload, async (payloadEvent: SessionTypes.PayloadEvent) => {
        if (
          isJsonRpcRequest(payloadEvent.payload) &&
          payloadEvent.topic === topic &&
          payloadEvent.chainId === chainId
        ) {
          clientB.logger.warn(`TEST >> JSON-RPC Request Received`);
          await clientB.respond({ topic, response });
          clientB.logger.warn(`TEST >> JSON-RPC Response Sent`);
          resolve();
        }
      });
    }),
    new Promise<void>(async (resolve, reject) => {
      clientA.logger.warn(`TEST >> JSON-RPC Request Sent`);
      time.start("request");
      result = await clientA.request({ topic, chainId, request });
      clientA.logger.warn(`TEST >> JSON-RPC Response Received`);
      time.stop("request");
      resolve();
    }),
  ]);

  // log elapsed times
  clientB.logger.warn(`TEST >> Request Elapsed Time: ${time.elapsed("request")}ms`);

  // jsonrpc request & response
  expect(result).to.eql;

  return result;
}