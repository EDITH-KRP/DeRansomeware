// Script to deploy the DeRansom contract to the Ethereum Sepolia testnet

async function main() {
  // Get the contract factory
  const DeRansom = await ethers.getContractFactory("DeRansom");
  
  // Deploy the contract
  console.log("Deploying DeRansom contract...");
  const deRansom = await DeRansom.deploy();
  
  // Wait for deployment to finish
  await deRansom.deployed();
  
  console.log("DeRansom contract deployed to:", deRansom.address);
  
  // Verify the contract on Etherscan (if API key is provided)
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for block confirmations...");
    // Wait for 6 block confirmations
    await deRansom.deployTransaction.wait(6);
    
    // Verify the contract
    console.log("Verifying contract on Etherscan...");
    await hre.run("verify:verify", {
      address: deRansom.address,
      constructorArguments: [],
    });
    console.log("Contract verified on Etherscan");
  }
  
  // Return the contract address
  return deRansom.address;
}

// Execute the deployment
main()
  .then((address) => {
    console.log("Deployment successful!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error during deployment:", error);
    process.exit(1);
  });