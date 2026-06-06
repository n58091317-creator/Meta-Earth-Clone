import { GeneratedType } from "@cosmjs/proto-signing";
import { MsgRemoveKyc } from "./types/rollapp/kyc/tx";
import { MsgUpdateCredential } from "./types/rollapp/kyc/tx";
import { MsgUpdateDID } from "./types/rollapp/kyc/tx";
import { MsgUpdateKycInfo } from "./types/rollapp/kyc/tx";

const msgTypes: Array<[string, GeneratedType]>  = [
    ["/stchain.rollapp.kyc.MsgRemoveKyc", MsgRemoveKyc],
    ["/stchain.rollapp.kyc.MsgUpdateCredential", MsgUpdateCredential],
    ["/stchain.rollapp.kyc.MsgUpdateDID", MsgUpdateDID],
    ["/stchain.rollapp.kyc.MsgUpdateKycInfo", MsgUpdateKycInfo],
    
];

export { msgTypes }