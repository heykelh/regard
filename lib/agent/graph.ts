import { StateGraph, START, END } from "@langchain/langgraph";
import { AgentState, type AgentStateType } from "./state";
import { planNode } from "./nodes/plan";
import { retrieveNode } from "./nodes/retrieve";
import { crosscheckNode } from "./nodes/crosscheck";
import { verifyNode } from "./nodes/verify";
import { finalizeNode } from "./nodes/finalize";

function afterVerify(state: AgentStateType): "do_finalize" | "do_crosscheck" {
  return state.verdict === "retry" ? "do_crosscheck" : "do_finalize";
}

export const agentGraph = new StateGraph(AgentState)
  .addNode("do_plan", planNode)
  .addNode("do_retrieve", retrieveNode)
  .addNode("do_crosscheck", crosscheckNode)
  .addNode("do_verify", verifyNode)
  .addNode("do_finalize", finalizeNode)
  .addEdge(START, "do_plan")
  .addEdge("do_plan", "do_retrieve")
  .addEdge("do_retrieve", "do_crosscheck")
  .addEdge("do_crosscheck", "do_verify")
  .addConditionalEdges("do_verify", afterVerify, {
    do_finalize: "do_finalize",
    do_crosscheck: "do_crosscheck",
  })
  .addEdge("do_finalize", END)
  .compile();