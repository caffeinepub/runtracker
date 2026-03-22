import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RunSession } from "../backend.d";
import { useActor } from "./useActor";

export function useGetAllRuns() {
  const { actor, isFetching } = useActor();
  return useQuery<RunSession[]>({
    queryKey: ["runs"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllRunSessionsByStartTime();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveRun() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (session: RunSession) => {
      if (!actor) throw new Error("Actor not available");
      return actor.saveRunSession(session);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["runs"] });
    },
  });
}
