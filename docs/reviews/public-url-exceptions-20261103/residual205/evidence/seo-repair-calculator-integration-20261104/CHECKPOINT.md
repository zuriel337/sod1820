# WIP checkpoint — SEO repair before Calculator integration

Product base ae8deb7ae1775046dc616a41f66307a7881dfe70; current task BEFORE aaac9c38-847b-4b5a-bf64-e5df2e5a6fca.

The three-file metadata/profile repair and38 focused synthetic behavior tests are saved as work not yet accepted. Original37-case run included25 failures, one of which was a Golden-test fixture that did not open the synthetic gate. The first38-case after run passed37 with only that fixture failure. Opening only the synthetic standalone Number gate lets the test actually reach its existing Golden metadata branch;38/38 then pass. No production flag was changed and no assertion was removed. Raw outcomes and original log hashes are preserved.

Earlier own audit evidence and its calculator regression are adopted additively from7d1320c2. No Community or Calculator page is changed in this checkpoint. Newer Community commits f7bfbcd5/5f92bfd2 must be retained in the integration base. User now explicitly asks to adopt the9-commit Calculator handoff at b06f0ff879f6d5a463f507c685afacb827ba03ae. That work has not been applied here.

This checkpoint is not a final acceptance, hosted Preview or Production deployment. No main, force, reset, product data, shared setting or domain change.
