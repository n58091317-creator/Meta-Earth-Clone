package types

type KYCCredentialI interface {
	GetRegion() string
}

var _ KYCCredentialI = (*KYCCredential)(nil)

func (k KYCCredential) GetRegion() string {
	if k.Credential == nil {
		return ""
	}
	return string(k.Credential.Data)
}
