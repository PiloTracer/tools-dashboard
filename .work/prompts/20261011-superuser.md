@x-director - 1- need to define any registered user of any app as super-user (or administrator) does this already exist?  

 ✨ 2. then let's use a different term, it would be a per-app superuser role, let's use different name (not "Administrator" but "Superuser")                                                                                                                                 


 ✨ The feature must include the capacity to provide such information to the client/calling/client application, like "ecards".   oauth-Client application ecards must be able to verify if a user is a superuser                                                             


 ✨ The feature must include the capacity to provide such information to the client/calling/client application, like "ecards".   oauth-Client application ecards must be able to verify if a user is a superuser                                                             

any model changes must be idempotently/transparently/seamlessly applied into the application, maybe on application restart or something like that, make sure this is idempotent and reliable.   


 ✨ A superuser cannot change the app registration in the tools-dashboard app, but can execute certain actions in the client app... make sure this is clear.                                                                                                                 
    A superuser is not an Administrator, and again: cannot modify the registration/permissions in the tools-dashboard app for any given app.                                                                                                                                 
    A superuser is a role that applies/is-used-by the target application... the target application must define what those permissions mean.   


    design this in a way that multiple roles can be added later.   


The tools-dashboard administrator, in charge of managing users, should also be able to designate a user as "Superuser" on all applications the user has access to, or give such role specific to a single application.... this requires important adjustments on the UI.