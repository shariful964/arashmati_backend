import FAQ from "../models/faqModel.js";

// get FAQs both admin and user 

export const getFAQs = async(req, res)=>{
    try {
        const faqs = await FAQ.find({isActive: true}).sort({order: 1, createdAt: -1});
        const cleanedFAQs = faqs.map(faq => ({
            _id: faq._id,
            question: faq.question,
            answer: faq.answer,
        
        }));
        return res.status(200).json({
            msg: "FAQs fetched successfully", 
            faqs: cleanedFAQs
        });
    } catch (error) {
      return res.status(500).json({
        msg: error.message || "Internal server error"
      })  
    }
}

// create faqs only admin 
export const createFAQ = async(req, res)=>{
    try {
        const {question, answer, order} = req.body;
        if(!question || !answer) {
            return res.status(400).json({
                msg: "Question and answer are required"
            });
        };
        const newFAQ = await FAQ.create({question, answer, order: order || 0});
        return res.status(201).json({
            msg: "FAQ created successfully", 
            faq: newFAQ
        });
        
    } catch (error) {
      return res.status(500).json({
        msg: error.message || "Internal server error"
      })  
    }
}

//update faq only admin
export const updateFAQ = async(req, res)=>{
    try {
        const {id} = req.params;
        const {question, answer, order, isActive} = req.body;
        const faq = await FAQ.findById(id);
        // validation
        if(!faq) {
            return res.status(404).json({
                msg: "FAQ not found"
            });
        }
        
        //partial update logic 
        if(question !== undefined) faq.question = question;
        if(answer !== undefined) faq.answer = answer;
        if(order !== undefined) faq.order = order;
        if(isActive !== undefined) faq.isActive = isActive;

        await faq.save();

        return res.status(200).json({
            msg: "FAQ updated successfully",
            faq
        });
    } catch (error) {
      return res.status(500).json({
        msg: error.message || "Internal server error"
      })  
    }
};

// delete faq only admin 
export const deleteFAQ = async(req, res)=>{
  try {
    const {id} = req.params;
    const faq = await FAQ.findByIdAndDelete(id);
    if(!faq) {
        return res.status(404).json({
            msg: "FAQ not found"
        });
    }
    return res.status(200).json({
        msg: "FAQ deleted successfully",
        faq
    });
  } catch (error) {
    return res.status(500).json({
      msg: error.message || "Internal server error"
    })  
  }
}