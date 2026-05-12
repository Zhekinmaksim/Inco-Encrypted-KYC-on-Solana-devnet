use arcis::*;

#[encrypted]
mod circuits {
    use arcis::*;

    #[derive(Copy, Clone)]
    pub struct ApplicantInputs {
        pub jurisdiction_allowed: bool,
        pub accredited: bool,
        pub net_worth_band: u8,
        pub requested_allocation: u64,
        pub pep_risk: bool,
        pub sanctions_flag: bool,
        pub document_verified: bool,
    }

    #[derive(Copy, Clone)]
    pub struct EligibilityOutcome {
        pub eligible: bool,
        pub risk_tier: u8,
        pub max_allocation: u64,
        pub manual_review: bool,
        pub required_reveal_mask: u16,
    }

    #[instruction]
    pub fn compute_eligibility_clean(
        input_ctxt: Enc<Shared, ApplicantInputs>,
    ) -> Enc<Shared, EligibilityOutcome> {
        let input = input_ctxt.to_arcis();

        let compliance_ok = input.jurisdiction_allowed
            & input.accredited
            & input.document_verified
            & !input.sanctions_flag;

        let manual_review = input.pep_risk | input.sanctions_flag;

        let risk_tier: u8 = if input.net_worth_band >= 3 {
            1
        } else if input.net_worth_band >= 2 {
            2
        } else {
            3
        };

        let max_allocation: u64 = if risk_tier == 1 {
            500_000
        } else if risk_tier == 2 {
            100_000
        } else {
            25_000
        };

        let eligible =
            compliance_ok & !manual_review & (input.requested_allocation <= max_allocation);

        let required_reveal_mask: u16 = if manual_review {
            0b0011_0110
        } else {
            0b0000_0011
        };

        input_ctxt.owner.from_arcis(EligibilityOutcome {
            eligible,
            risk_tier,
            max_allocation,
            manual_review,
            required_reveal_mask,
        })
    }
}
