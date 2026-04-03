import { trpc } from "@/lib/trpc";

interface OperationLevel {
  limit?: number | null;
  centiCreditCost: number;
}

interface CreditsPerOperation {
  [key: string]: { levels: OperationLevel[] } | undefined;
}

function getCost(op: { levels: OperationLevel[] } | undefined): string {
  if (!op?.levels?.[0]) return "?";
  const centi = op.levels[0].centiCreditCost;
  const credits = centi / 100;
  return credits % 1 === 0 ? credits.toString() : credits.toFixed(2);
}

export function useCreditCosts() {
  const credits = trpc.utility.getCredits.useQuery(undefined, {
    staleTime: 60_000,
    retry: false,
  });

  const data = credits.data as {
    output?: { creditsPerOperation?: CreditsPerOperation };
  } | undefined;

  const ops = data?.output?.creditsPerOperation;

  return {
    isLoading: credits.isLoading,
    workEmail: getCost(ops?.workEmailReveal),
    personalEmail: getCost(ops?.personalEmailReveal),
    phone: getCost(ops?.phoneReveal),
    liveEnrichPerson: getCost(ops?.liveEnrichPerson),
    liveEnrichCompany: getCost(ops?.liveEnrichCompany),
    companySearch: getCost(ops?.getCompanyFromDb),
    personSearch: getCost(ops?.getPersonFromDb),
    validateEmail: getCost(ops?.validateEmail),
    validatePhone: getCost(ops?.validatePhone),
    googleMaps: getCost(ops?.googleMapsScrape),
    domainLookup: getCost(ops?.domainLookupAgent),
    reverseEmail: getCost(ops?.emailToLinkedinUrl),
  };
}
