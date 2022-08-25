const { getNamedAccounts, ethers } = require("hardhat")

const AMOUNT = ethers.utils.parseEther("0.02")

async function getWeth() {
    const { deployer } = await getNamedAccounts()
    // call the deposit function on the weth contract
    // we need abi, contract address
    const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" // mainnet
    const iWeth = await ethers.getContractAt("IWeth", wethAddress, deployer)
    const tx = await iWeth.deposit({ value: AMOUNT })
    await tx.wait(1)
    const wethBalance = await iWeth.balanceOf(deployer)
    //console.log(`Got ${wethBalance.toString()} WETH.`)
    console.log(`Got ${ethers.utils.formatUnits(wethBalance)} WETH.`)
}

module.exports = { getWeth, AMOUNT }
