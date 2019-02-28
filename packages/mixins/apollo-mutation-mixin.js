import { ApolloElementMixin } from './apollo-element-mixin';
import { ApolloError } from 'apollo-client';

/**
 * `ApolloMutationMixin`: class mixin for apollo-mutation elements.
 *
 * @polymer
 * @mixinFunction
 * @appliesMixin ApolloElementMixin
 *
 * @param {Class} superclass
 * @return {Class}
 */
export const ApolloMutationMixin = superclass => class extends ApolloElementMixin(superclass) {
  /**
   * The mutation.
   *
   * @return {DocumentNode}
   */
  get mutation() {
    return this.document;
  }

  set mutation(mutation) {
    try {
      this.document = mutation;
    } catch (error) {
      throw new TypeError('Mutation must be a gql-parsed DocumentNode');
    }
  }

  constructor() {
    super();

    /**
     * Whether to ignore the results of the mutation.
     * @type {Boolean}
     */
    this.ignoreResults = false;

    /**
     * The ID number of the most recent mutation since the element was instantiated.
     * @type {Number}
     */
    this.mostRecentMutationId = 0;

    /**
     * An object that represents the result of this mutation that
     * will be optimistically stored before the server has actually returned a
     * result.
     *
     * This is most often used for optimistic UI, where we want to be able to see
     * the result of a mutation immediately, and update the UI later if any errors
     * appear.
     * @type {Object}
     */
    this.optimisticResponse;

    /**
     * A function which updates the apollo cache when the query responds.
     * This function will be called twice over the lifecycle of a mutation.
     * Once at the very beginning if an optimisticResponse was provided.
     * The writes created from the optimistic data will be rolled back before
     * the second time this function is called which is when the mutation has
     * succesfully resolved. At that point update will be called with the actual
     * mutation result and those writes will not be rolled back.
     *
     * The reason a DataProxy is provided instead of the user calling the methods
     * directly on ApolloClient is that all of the writes are batched together at
     * the end of the update, and it allows for writes generated by optimistic
     * data to be rolled back.
     * @type {MutationUpdaterFn}
     */
    this.update;

    /**
     * An object that maps from the name of a variable as used in the mutation GraphQL document to that variable's value.
     * @type {Object}
     */
    this.variables;

    this.__explicitlySetMutation;
  }

  /**
   * Increments and returns the most recent mutation id.
   *
   * @return {number}
   * @protected
   */
  generateMutationId() {
    this.mostRecentMutationId += 1;
    return this.mostRecentMutationId;
  }

  /**
   * Returns true when an ID matches the most recent mutation id.
   *
   * @param  {number}  mutationId
   * @return {boolean}
   * @protected
   */
  isMostRecentMutation(mutationId) {
    return this.mostRecentMutationId === mutationId;
  }

  /**
   * This resolves a single mutation according to the options specified and returns a Promise which is either resolved with the resulting data or rejected with an error.
   *
   * @param  {Object}               params
   * @param  {Object}               params.context
   * @param  {ErrorPolicy}          params.errorPolicy
   * @param  {FetchPolicy}          params.fetchPolicy
   * @param  {DocumentNode}         params.mutation
   * @param  {Object|Function}      params.optimisticResponse
   * @param  {Array<DocumentNode>}  params.refetchQueries
   * @param  {UpdateFunction}       params.update
   * @param  {boolean}              params.awaitRefetchQueries
   * @param  {Object}               params.variables
   * @return {Promise<FetchResult>}
   */
  async mutate({
    context = this.context,
    errorPolicy = this.errorPolicy,
    fetchPolicy = this.fetchPolicy,
    mutation = this.mutation,
    optimisticResponse = this.optimisticResponse,
    refetchQueries = this.refetchQueries,
    update = this.update,
    awaitRefetchQueries = this.awaitRefetchQueries,
    variables = this.variables,
  } = {}) {
    const mutationId = this.generateMutationId();

    this.loading = true;
    this.error = undefined;
    this.data = undefined;
    this.called = true;

    try {
      const response = await this.client.mutate({
        context,
        errorPolicy,
        fetchPolicy,
        mutation,
        optimisticResponse,
        refetchQueries,
        update,
        awaitRefetchQueries,
        variables,
      });

      this.onCompletedMutation(response, mutationId);
      return response;
    } catch (error) {
      this.onMutationError(error, mutationId);
      return error;
    }
  }

  /**
   * Callback for when a mutation is completed.
   *
   * @param  {FetchResult} response
   * @param  {number} mutationId
   * @return {any}
   * @protected
   */
  onCompletedMutation(response, mutationId) {
    const { data, errors = [] } = response;
    const error = errors.length ? new ApolloError({ graphQLErrors: errors }) : null;
    if (this.isMostRecentMutation(mutationId) && !this.ignoreResults) {
      this.loading = false;
      this.error = error;
      this.data = data;
    }
    return this.onCompleted(data);
  }

  /**
   * Callback for when a mutation fails.
   *
   * @param  {Error} error mutation error
   * @param  {number} mutationId id of the mutation
   * @return {any}
   * @protected
   */
  onMutationError(error, mutationId) {
    if (this.isMostRecentMutation(mutationId)) {
      this.loading = false;
      this.data = null;
      this.error = error;
    }
    return this.onError(error);
  }

  /**
   * Callback for when a mutation is completed.
   *
   * @abstract
   */
  onCompleted() { }

  /**
   * Callback for when an error occurs in mutation.
   *
   * @abstract
   */
  onError() { }
};
