import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import templateService from "../services/templateService";

/**
 * Custom hook for template CRUD operations using React Query
 *
 * @param {Object} [listParams] - Parameters for listing templates
 * @param {number} [listParams.page] - Page number
 * @param {number} [listParams.page_size] - Items per page
 * @param {boolean} [listParams.include_shared] - Include shared templates
 * @param {string} [listParams.search] - Search term
 *
 * @returns {Object} Object containing template data and mutation functions
 */
export default function useTemplates(listParams = {}) {
  const queryClient = useQueryClient();

  // Build query key for list query
  const listQueryKey = ["templates", listParams];

  // Query for listing templates
  const {
    data: templatesData,
    isLoading: isLoadingList,
    error: listError,
    refetch: refetchTemplates,
  } = useQuery({
    queryKey: listQueryKey,
    queryFn: () => templateService.getTemplates(listParams),
    staleTime: 30 * 1000, // Data considered fresh for 30 seconds
  });

  // Mutation for creating a template
  const createTemplateMutation = useMutation({
    mutationFn: (templateData) => templateService.createTemplate(templateData),
    onSuccess: () => {
      // Invalidate templates list queries to refetch after creation
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });

  // Mutation for updating a template
  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => templateService.updateTemplate(id, data),
    onSuccess: (data, variables) => {
      // Invalidate both list and specific template queries
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["template", variables.id] });
    },
  });

  // Mutation for deleting a template
  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => templateService.deleteTemplate(id),
    onSuccess: (data, id) => {
      // Invalidate templates list queries
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      // Remove specific template from cache
      queryClient.removeQueries({ queryKey: ["template", id] });
    },
  });

  return {
    // List query data
    templates: templatesData?.results ?? [],
    total: templatesData?.total ?? 0,
    page: templatesData?.page ?? 1,
    page_size: templatesData?.page_size ?? 20,
    total_pages: templatesData?.total_pages ?? 0,
    isLoadingList,
    listError,
    refetchTemplates,

    // Create mutation
    createTemplate: createTemplateMutation.mutate,
    createTemplateAsync: createTemplateMutation.mutateAsync,
    isCreating: createTemplateMutation.isPending,
    createError: createTemplateMutation.error,

    // Update mutation
    updateTemplate: (id, data) => updateTemplateMutation.mutate({ id, data }),
    updateTemplateAsync: (id, data) => updateTemplateMutation.mutateAsync({ id, data }),
    isUpdating: updateTemplateMutation.isPending,
    updateError: updateTemplateMutation.error,

    // Delete mutation
    deleteTemplate: deleteTemplateMutation.mutate,
    deleteTemplateAsync: deleteTemplateMutation.mutateAsync,
    isDeleting: deleteTemplateMutation.isPending,
    deleteError: deleteTemplateMutation.error,
  };
}
