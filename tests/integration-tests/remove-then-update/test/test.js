const path = require("path");
const execSync = require("child_process").execSync;
const { system, patching } = require("gluegun");
const { createApolloFetch } = require("apollo-fetch");

const Contract = artifacts.require("./Contract.sol");

const srcDir = path.join(__dirname, "..");

const fetchSubgraphs = createApolloFetch({
  uri: "http://localhost:18030/graphql",
});
const fetchSubgraph = createApolloFetch({
  uri: "http://localhost:18000/subgraphs/name/test/remove-then-update",
});

const exec = (cmd) => {
  try {
    return execSync(cmd, { cwd: srcDir, stdio: "inherit" });
  } catch (e) {
    throw new Error(`Failed to run command \`${cmd}\``);
  }
};

const waitForSubgraphToBeSynced = async () =>
  new Promise((resolve, reject) => {
    // Wait for 5s
    let deadline = Date.now() + 5 * 1000;

    // Function to check if the subgraph is synced
    const checkSubgraphSynced = async () => {
      try {
        let result = await fetchSubgraphs({
          query: `{ indexingStatuses { synced, health } }`,
        });

        if (result.data.indexingStatuses[0].synced) {
          resolve();
        } else if (result.data.indexingStatuses[0].health != "healthy") {
          reject(new Error("Subgraph failed"));
        } else {
          throw new Error("reject or retry");
        }
      } catch (e) {
        if (Date.now() > deadline) {
          reject(new Error(`Timed out waiting for the subgraph to sync`));
        } else {
          setTimeout(checkSubgraphSynced, 500);
        }
      }
    };

    // Periodically check whether the subgraph has synced
    setTimeout(checkSubgraphSynced, 0);
  });

contract("Contract", (accounts) => {
  // Deploy the subgraph once before all tests
  before(async () => {
    // Deploy the contract
    const contract = await Contract.deployed();
    await contract.emitTrigger(1);

    // Insert its address into subgraph manifest
    await patching.replace(
      path.join(srcDir, "subgraph.yaml"),
      "0x0000000000000000000000000000000000000000",
      contract.address
    );

    // Create and deploy the subgraph
    exec(`yarn codegen`);
    exec(`yarn create:test`);
    exec(`yarn deploy:test`);

    // Wait for the subgraph to be indexed
    await waitForSubgraphToBeSynced();
  });

  it("all overloads of the contract function are called", async () => {
    let result = await fetchSubgraph({
      query: `{ foos(orderBy: id) { id value removed } }`,
    });

    expect(result.errors).to.be.undefined;
    expect(result.data).to.deep.equal({
      foos: [
        {
          id: "0",
          removed: true,
          value: null,
        },
      ],
    });
  });
});
