/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import
  {
    HardhatEthersHelpers as HardhatEthersHelpersBase
  } from "@nomiclabs/hardhat-ethers/types"
import { ethers } from "ethers"
import * as Contracts from "."


declare module "hardhat/types/runtime" {
  interface HardhatEthersHelpers extends HardhatEthersHelpersBase
  {
    getContractFactory(
      name: "App",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.App__factory>
    getContractFactory(
      name: "Migrations",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.Migrations__factory>

    getContractAt(
      name: "App",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.App>
    getContractAt(
      name: "Migrations",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.Migrations>

    // default types
    getContractFactory(
      name: string,
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<ethers.ContractFactory>
    getContractFactory(
      abi: any[],
      bytecode: ethers.utils.BytesLike,
      signer?: ethers.Signer
    ): Promise<ethers.ContractFactory>
    getContractAt(
      nameOrAbi: string | any[],
      address: string,
      signer?: ethers.Signer
    ): Promise<ethers.Contract>
  }
}
