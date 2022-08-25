// imports
const { ethers, getNamedAccounts } = require("hardhat")
const { getWeth, AMOUNT } = require("../scripts/getWeth")

async function main() {
    // the protocol treats everything as an erc20 token
    // which is why we use weth
    console.log("")
    await getWeth()
    const { deployer } = await getNamedAccounts()

    // get lending pool
    const lendingPool = await getLendingPool(deployer)
    console.log(`LendingPool address: ${lendingPool.address}`)
    console.log("")

    // deposit
    const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    // approve
    await approveErc20(wethTokenAddress, lendingPool.address, AMOUNT, deployer)
    console.log(`Depositing ${ethers.utils.formatUnits(AMOUNT)} WETH to lending pool...`)
    await lendingPool.deposit(
        wethTokenAddress, // asset
        AMOUNT, // amount
        deployer, // onBehalfOf
        0 // referralCode (discontinued)
    )
    console.log("Deposited.")
    console.log("")

    // borrow
    // want to know
    // how much we borrowed, how much we can borrow, how much collateral we have
    // getUserAccountData()
    let { availableBorrowsETH, totalDebtETH } = await getBorrowUserData(lendingPool, deployer)
    console.log("")
    // get conversion rate of DAI to borrow the max
    // use price oracle
    const daiPrice = await getDaiPrice()
    // borrow 95% of the maximum
    const amountDaiToBorrow = availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber())
    console.log(`We can borrow ${amountDaiToBorrow} DAI`)
    const amountDaiToBorrowWei = ethers.utils.parseEther(amountDaiToBorrow.toString())
    const daiTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
    await borrowDai(daiTokenAddress, lendingPool, amountDaiToBorrowWei, deployer)
    await getBorrowUserData(lendingPool, deployer)
    console.log("")

    // repay
    await repay(amountDaiToBorrowWei, daiTokenAddress, lendingPool, deployer)
    await getBorrowUserData(lendingPool, deployer)
}

async function repay(amount, daiAddress, lendingPool, account) {
    // approve dai
    await approveErc20(daiAddress, lendingPool.address, amount, account)
    // repay
    const repayTx = await lendingPool.repay(
        daiAddress, // address asset
        amount, // uint256 amount
        1, // uint256 rateMode
        account // address onBehalfOf
    )
    await repayTx.wait(1)
    console.log(`Repaid ${ethers.utils.formatUnits(amount)}!`)
}

async function borrowDai(daiAddress, lendingPool, amountDaiToBorrowWei, account) {
    const borrowTx = await lendingPool.borrow(
        daiAddress, // address asset
        amountDaiToBorrowWei, // uint256 amount
        1, // uint256 interestRateMode (1=stable, 2=variable)
        0, // uint16 referralCode
        account // address onBehalfOf
    )
    await borrowTx.wait(1)
    console.log("Borrow complete!")
}

async function getDaiPrice() {
    const daiEthPriceFeedAddress = "0x773616E4d11A78F511299002da57A0a94577F1f4"
    const daiEthPriceFeed = await ethers.getContractAt(
        "IAggregatorV3Interface",
        daiEthPriceFeedAddress
    )
    // dont need to connect to deployer, as we will only be reading from the contract
    const price = (await daiEthPriceFeed.latestRoundData())[1]
    console.log(`DAI/ETH price is ${ethers.utils.formatUnits(price)}`)
    return price
}

async function getBorrowUserData(lendingPool, account) {
    const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
        await lendingPool.getUserAccountData(account)
    console.log(`You have ${ethers.utils.formatUnits(totalCollateralETH)} worth of ETH deposited`)
    console.log(`You have ${ethers.utils.formatUnits(totalDebtETH)} worth of ETH borrowed`)
    console.log(`You can borrow ${ethers.utils.formatUnits(availableBorrowsETH)} worth of ETH`)
    return { availableBorrowsETH, totalDebtETH }
}

async function getLendingPool(deployer) {
    const lendingPoolAddressesProviderAddress = "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5"
    const lendingPoolAddressesProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        lendingPoolAddressesProviderAddress,
        deployer
    )
    const lendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool()
    const lendingPool = await ethers.getContractAt("ILendingPool", lendingPoolAddress, deployer)
    return lendingPool
}

async function approveErc20(erc20Address, spenderAddress, amount, account) {
    const erc20Token = await ethers.getContractAt("IERC20", erc20Address, account)
    const tx = await erc20Token.approve(spenderAddress, amount)
    await tx.wait(1)
    console.log("Approved!")
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
